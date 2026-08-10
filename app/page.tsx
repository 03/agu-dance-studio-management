"use client"

import { useState } from "react"
import { RoleSwitcher } from "@/components/role-switcher"
import { StudentApp } from "@/components/student/student-app"
import { TeacherApp } from "@/components/teacher/teacher-app"
import { AdminApp } from "@/components/admin/admin-app"

export type Role = "student" | "teacher" | "admin" | null

export default function Page() {
  const [role, setRole] = useState<Role>(null)

  if (role === "student") return <StudentApp onExit={() => setRole(null)} />
  if (role === "teacher") return <TeacherApp onExit={() => setRole(null)} />
  if (role === "admin") return <AdminApp onExit={() => setRole(null)} />
  return <RoleSwitcher onSelect={setRole} />
}
