import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { dumpBusinessData, backupFilename } from "@/lib/backup"
import { sendBackupEmail } from "@/lib/email"

export async function GET() {
  let session
  try {
    session = await requireRole("ADMIN")
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const filename = backupFilename()
  try {
    const content = await dumpBusinessData()

    // The off-site email copy is a bonus on top of the download the admin
    // is actively waiting on — a failed send must not fail the backup itself,
    // just get noted on the audit record.
    let emailNote: string | null = null
    try {
      await sendBackupEmail(content, filename)
    } catch (emailErr) {
      emailNote = `Email copy failed: ${emailErr instanceof Error ? emailErr.message : "unknown error"}`.slice(0, 500)
    }

    await prisma.backupRecord.create({
      data: { action: "BACKUP", filename, status: "SUCCESS", message: emailNote, createdBy: session.username },
    })
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : "unknown error"
    await prisma.backupRecord.create({
      data: { action: "BACKUP", filename, status: "FAILED", message, createdBy: session.username },
    })
    return NextResponse.json({ error: "BACKUP_FAILED", message }, { status: 500 })
  }
}
