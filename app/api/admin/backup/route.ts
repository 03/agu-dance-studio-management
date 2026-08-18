import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { dumpBusinessData, backupFilename } from "@/lib/backup"

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
    await prisma.backupRecord.create({
      data: { action: "BACKUP", filename, status: "SUCCESS", createdBy: session.username },
    })
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/sql",
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
