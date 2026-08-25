"use client"

import { useState } from "react"
import { RoleSwitcher } from "@/components/role-switcher"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import type { PublicScheduleData } from "@/lib/data"

export type Role = "student" | "teacher" | "admin" | null

// Pre-authentication experience only: pick a role card, then log in (or,
// for students, register) as that role. The only business data fetched
// before login is the public class schedule (publicData) — everything else
// only happens after app/page.tsx sees a valid session. `initialRole` lets
// the /student, /teacher, /admin route shortcuts land straight on that
// role's login form instead of the card picker.
export function AppShell({
  publicData,
  initialRole = null,
}: {
  publicData: PublicScheduleData
  initialRole?: Role
}) {
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole)
  const [mode, setMode] = useState<"login" | "register">("login")

  const selectRole = (role: Role) => {
    setMode("login")
    setSelectedRole(role)
  }

  if (selectedRole === "student" && mode === "register") {
    return <RegisterForm onBack={() => setMode("login")} />
  }
  if (selectedRole) {
    return (
      <LoginForm
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
        onRegister={selectedRole === "student" ? () => setMode("register") : undefined}
      />
    )
  }
  return <RoleSwitcher onSelect={selectRole} publicData={publicData} />
}
