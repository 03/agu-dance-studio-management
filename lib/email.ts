// Sends the post-backup off-site copy via Resend's HTTP API — a single
// fetch call, no SDK/dependency needed. Best-effort by design: a failed
// send must never block the admin's own backup/download, so callers are
// expected to catch this and just note the failure, not surface it as the
// backup itself failing.
import { gzipSync } from "node:zlib"

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export async function sendBackupEmail(jsonContent: Buffer, filename: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.BACKUP_EMAIL_TO
  const from = process.env.BACKUP_EMAIL_FROM
  const missing = [
    !apiKey && "RESEND_API_KEY",
    !to && "BACKUP_EMAIL_TO",
    !from && "BACKUP_EMAIL_FROM",
  ].filter(Boolean)
  if (missing.length > 0) {
    throw new Error(`EMAIL_NOT_CONFIGURED: missing ${missing.join(", ")}`)
  }

  const gzipped = gzipSync(jsonContent)
  const attachmentFilename = filename.replace(/\.json$/, ".json.gz")

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Agu 舞蹈工作室数据备份 · ${filename}`,
      text: `自动备份附件：${attachmentFilename}`,
      attachments: [{ filename: attachmentFilename, content: gzipped.toString("base64") }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`RESEND_FAILED: ${res.status} ${body.slice(0, 300)}`)
  }
}
