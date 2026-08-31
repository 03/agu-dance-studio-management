import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { runBackupCycle } from "@/lib/backup"

export async function GET() {
  let session
  try {
    session = await requireRole("ADMIN")
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const result = await runBackupCycle(session.username)
  if (!result.ok) {
    return NextResponse.json({ error: "BACKUP_FAILED", message: result.message }, { status: 500 })
  }
  return new NextResponse(result.content, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  })
}
