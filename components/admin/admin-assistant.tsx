"use client"

import { useState } from "react"
import { Loader2, Copy, Check, Send } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import {
  draftAnnouncement,
  askStudioData,
  type AnnouncementKind,
  type AnnouncementTone,
  type AnnouncementLang,
} from "@/lib/actions/ai-assistant"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const ERROR_KEY: Record<string, string> = {
  AI_NOT_CONFIGURED: "adm.ai.err.notConfigured",
  INVALID_INPUT: "adm.ai.err.invalid",
  AI_FAILED: "adm.ai.err.failed",
  AI_TOO_MANY_STEPS: "adm.ai.err.failed",
}
const errorKeyFor = (code: string) => ERROR_KEY[code] ?? "adm.ai.err.generic"

const KINDS: AnnouncementKind[] = ["cancellation", "holiday", "promotion", "other"]
const TONES: AnnouncementTone[] = ["friendly", "formal"]
const LANGS: AnnouncementLang[] = ["zh", "en"]

export function AdminAssistant() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-3xl">
      <Tabs defaultValue="draft">
        <TabsList>
          <TabsTrigger value="draft">{t("adm.ai.tab.draft")}</TabsTrigger>
          <TabsTrigger value="ask">{t("adm.ai.tab.ask")}</TabsTrigger>
        </TabsList>
        <TabsContent value="draft">
          <DraftPanel />
        </TabsContent>
        <TabsContent value="ask">
          <AskPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {children}
    </Button>
  )
}

function DraftPanel() {
  const { t } = useLanguage()
  const [kind, setKind] = useState<AnnouncementKind>("cancellation")
  const [tone, setTone] = useState<AnnouncementTone>("friendly")
  const [languages, setLanguages] = useState<AnnouncementLang[]>(["zh", "en"])
  const [details, setDetails] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggleLang = (l: AnnouncementLang) =>
    setLanguages((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))

  const generate = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    setCopied(false)
    const res = await draftAnnouncement({ kind, details, tone, languages })
    setPending(false)
    if (res.ok) setOutput(res.text)
    else setError(errorKeyFor(res.error))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
    } catch {
      /* clipboard can be blocked (insecure origin) — the text stays selectable */
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {t(`adm.ai.kind.${k}`)}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {TONES.map((x) => (
          <Chip key={x} active={tone === x} onClick={() => setTone(x)}>
            {t(`adm.ai.tone.${x}`)}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {LANGS.map((l) => (
          <Chip key={l} active={languages.includes(l)} onClick={() => toggleLang(l)}>
            {t(`adm.ai.lang.${l}`)}
          </Chip>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium text-card-foreground">{t("adm.ai.detailsLabel")}</p>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t("adm.ai.detailsPlaceholder")}
          rows={4}
        />
      </div>
      <div>
        <Button onClick={generate} disabled={pending || !details.trim() || languages.length === 0}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? t("adm.ai.generating") : t("adm.ai.generate")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{t(error)}</p>}
      {output && (
        <div className="grid gap-2">
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm text-card-foreground">
            {output}
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? t("adm.ai.copied") : t("adm.ai.copy")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

type ChatMessage = { role: "user" | "assistant"; text: string }

function AskPanel() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const send = async () => {
    const question = input.trim()
    if (!question || pending) return
    const next: ChatMessage[] = [...messages, { role: "user", text: question }]
    setMessages(next)
    setInput("")
    setError(null)
    setPending(true)
    const res = await askStudioData(next)
    setPending(false)
    if (res.ok) setMessages([...next, { role: "assistant", text: res.text }])
    else setError(errorKeyFor(res.error))
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{t("adm.ai.askHint")}</p>
      <div className="flex min-h-[200px] flex-col gap-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted text-foreground",
            )}
          >
            {m.text}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-1.5 self-start text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t("adm.ai.thinking")}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{t(error)}</p>}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={t("adm.ai.askPlaceholder")}
          rows={2}
        />
        <Button onClick={send} disabled={pending || !input.trim()} aria-label={t("adm.ai.send")}>
          <Send />
        </Button>
      </div>
    </div>
  )
}
