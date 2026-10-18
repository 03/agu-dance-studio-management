"use server"

import { requireRole } from "@/lib/auth"
import { AI_ASSISTANT_ENABLED } from "@/lib/feature-flags"
import { todayISO } from "@/lib/schedule-dates"
import { callClaude, textOf, type ClaudeMessage, type ContentBlock } from "@/lib/ai/anthropic"
import { TOOLS, runTool } from "@/lib/ai/tools"

// Same return-as-data convention as lib/actions/bookings.ts's ActionResult:
// a thrown message is redacted in production builds, so the UI could never
// tell "not configured" apart from a real failure.
export type AiResult = { ok: true; text: string } | { ok: false; error: string }

const KNOWN_ERRORS = new Set(["AI_NOT_CONFIGURED", "AI_DISABLED", "INVALID_INPUT", "AI_TOO_MANY_STEPS"])
const MAX_TOOL_ROUNDS = 5
const MAX_HISTORY = 10
const MAX_TEXT = 2000

function errorResult(e: unknown): { ok: false; error: string } {
  const message = e instanceof Error ? e.message : ""
  if (KNOWN_ERRORS.has(message)) return { ok: false, error: message }
  console.error("[ai-assistant]", e)
  return { ok: false, error: message.startsWith("ANTHROPIC_FAILED") ? "AI_FAILED" : "UNKNOWN" }
}

async function guard() {
  await requireRole("ADMIN")
  if (!AI_ASSISTANT_ENABLED) throw new Error("AI_DISABLED")
}

const KINDS = {
  cancellation: "a class cancellation notice",
  holiday: "a holiday closure notice",
  promotion: "a promotion / new-class announcement",
  other: "a general studio announcement",
} as const
export type AnnouncementKind = keyof typeof KINDS
export type AnnouncementTone = "friendly" | "formal"
export type AnnouncementLang = "zh" | "en"

export async function draftAnnouncement(input: {
  kind: AnnouncementKind
  details: string
  tone: AnnouncementTone
  languages: AnnouncementLang[]
}): Promise<AiResult> {
  try {
    await guard()
    const details = input.details?.trim() ?? ""
    const languages = input.languages?.filter((l) => l === "zh" || l === "en") ?? []
    if (!(input.kind in KINDS) || !details || details.length > MAX_TEXT || languages.length === 0) {
      throw new Error("INVALID_INPUT")
    }
    const langText =
      languages.length === 2
        ? "Write it twice: first in Simplified Chinese, then in English, separated by a blank line."
        : languages[0] === "zh"
          ? "Write it in Simplified Chinese only."
          : "Write it in English only."
    const res = await callClaude({
      system:
        "You write short announcements for Agu Dance Studio, a dance school in Melbourne, to be pasted into WeChat/Xiaohongshu or email. " +
        "Use ONLY the facts the admin gives you; never invent dates, times, prices or locations — if something essential is missing, leave a [placeholder]. " +
        `Tone: ${input.tone === "formal" ? "formal and polite" : "warm and friendly"}. ${langText} Output the announcement text only, no commentary.`,
      messages: [{ role: "user", content: `Write ${KINDS[input.kind]}.\n\nDetails:\n${details}` }],
      maxTokens: 800,
    })
    return { ok: true, text: textOf(res) }
  } catch (e) {
    return errorResult(e)
  }
}

export async function askStudioData(history: { role: "user" | "assistant"; text: string }[]): Promise<AiResult> {
  try {
    await guard()
    const turns = (history ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.text.slice(0, MAX_TEXT) }) as ClaudeMessage)
    while (turns.length > 0 && turns[0].role !== "user") turns.shift()
    if (turns.length === 0 || turns[turns.length - 1].role !== "user") throw new Error("INVALID_INPUT")

    const system =
      "You are a data assistant for the admin of Agu Dance Studio. Today is " +
      todayISO() +
      ". Answer ONLY from the results of the provided tools; call tools whenever you need numbers. " +
      "If the tools cannot answer (for example anything about individual students), say so plainly instead of guessing. " +
      "Money is in AUD. Reply in the same language as the question, concisely, and show the key figures."

    const messages: ClaudeMessage[] = [...turns]
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await callClaude({ system, messages, tools: TOOLS, maxTokens: 1500 })
      if (res.stop_reason !== "tool_use") return { ok: true, text: textOf(res) }

      messages.push({ role: "assistant", content: res.content })
      const results: ContentBlock[] = []
      for (const block of res.content) {
        if (block.type !== "tool_use") continue
        try {
          const output = await runTool(block.name, block.input)
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) })
        } catch (err) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : "tool failed",
            is_error: true,
          })
        }
      }
      messages.push({ role: "user", content: results })
    }
    throw new Error("AI_TOO_MANY_STEPS")
  } catch (e) {
    return errorResult(e)
  }
}
