import type { CurrentSession } from "@/lib/auth"
import { logout } from "@/lib/actions/auth"
import { getStudentAppData, getTeacherAppData, getAdminAppData } from "@/lib/data"
import { ChangePasswordGate } from "@/components/auth/change-password-gate"
import { StudentApp } from "@/components/student/student-app"
import { TeacherApp } from "@/components/teacher/teacher-app"
import { AdminApp } from "@/components/admin/admin-app"

// Renders the signed-in experience for whatever role the current session
// actually has. Shared by the root route and the /student, /teacher,
// /admin shortcuts — all of them fall back to this the moment a session
// exists, regardless of which URL got the request here. Returns null for
// the data-integrity edge case of a role missing its required linked
// record, so callers know to fall back to the pre-auth AppShell instead.
export async function renderAuthenticatedApp(session: CurrentSession) {
  if (session.mustChangePassword) return <ChangePasswordGate />

  if (session.role === "STUDENT" && session.studentId) {
    const data = await getStudentAppData(session.studentId)
    return <StudentApp data={data} onExit={logout} />
  }
  if (session.role === "TEACHER" && session.teacherId) {
    const data = await getTeacherAppData(session.teacherId)
    return <TeacherApp data={data} onExit={logout} />
  }
  if (session.role === "ADMIN") {
    const data = await getAdminAppData()
    return <AdminApp data={data} onExit={logout} />
  }

  return null
}
