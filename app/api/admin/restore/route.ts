import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { restoreBusinessData } from "@/lib/backup"

export async function POST(request: Request) {
  let session
  try {
    session = await requireRole("ADMIN")
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 })
  }
  const filename = file.name

  try {
    const content = await file.text()
    await restoreBusinessData(content)
    await prisma.backupRecord.create({
      data: { action: "RESTORE", filename, status: "SUCCESS", createdBy: session.username },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : "unknown error"
    await prisma.backupRecord.create({
      data: { action: "RESTORE", filename, status: "FAILED", message, createdBy: session.username },
    })
    return NextResponse.json({ error: "RESTORE_FAILED", message }, { status: 500 })
  }
}
