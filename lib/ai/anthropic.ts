// Minimal Anthropic Messages API client — a single fetch, no SDK, same
// approach as lib/email.ts's Resend call. Server-only: the API key is read
// from the environment here and never reaches the client bundle.

const ENDPOINT = "https://api.anthropic.com/v1/messages"
const DEFAULT_MODEL = "claude-sonnet-5"

export type TextBlock = { type: "text"; text: string }
export type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
export type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export type ClaudeMessage = { role: "user" | "assistant"; content: string | ContentBlock[] }

export type ClaudeTool = {
  name: string
  description: string
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] }
}

export type ClaudeResponse = {
  content: (TextBlock | ToolUseBlock)[]
  stop_reason: string
}

export async function callClaude(opts: {
  system: string
  messages: ClaudeMessage[]
  tools?: ClaudeTool[]
  maxTokens?: number
}): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED")

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: opts.messages,
      ...(opts.tools?.length ? { tools: opts.tools } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`ANTHROPIC_FAILED: ${res.status} ${body.slice(0, 300)}`)
  }
  return (await res.json()) as ClaudeResponse
}

export function textOf(res: ClaudeResponse): string {
  return res.content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()
}
