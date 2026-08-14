"use client"

import { useState } from "react"
import { RoleSwitcher } from "@/components/role-switcher"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"

export type Role = "student" | "teacher" | "admin" | null

// Pre-authentication experience only: pick a role card, then log in (or,
// for students, register) as that role. No business data is fetched or
// rendered here — that only happens after app/page.tsx sees a valid session.
export function AppShell() {
  const [selectedRole, setSelectedRole] = useState<Role>(null)
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
  return <RoleSwitcher onSelect={selectRole} />
}
