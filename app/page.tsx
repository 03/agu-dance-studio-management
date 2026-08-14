import { getSession } from "@/lib/auth"
import { logout } from "@/lib/actions/auth"
import { getStudentAppData, getTeacherAppData, getAdminAppData } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { ChangePasswordGate } from "@/components/auth/change-password-gate"
import { StudentApp } from "@/components/student/student-app"
import { TeacherApp } from "@/components/teacher/teacher-app"
import { AdminApp } from "@/components/admin/admin-app"

export default async function Page() {
  const session = await getSession()
  if (!session) return <AppShell />
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

  // Role doesn't have its required linked record (data-integrity edge case) — bounce to login.
  return <AppShell />
}
