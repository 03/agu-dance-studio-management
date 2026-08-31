"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { PublicSchedule } from "@/components/public-schedule"
import type { PublicScheduleData } from "@/lib/data"

export type Role = "student" | "teacher" | "admin" | null

// Pre-authentication experience only: a single page with the login card
// (role dropdown, defaulting to student) on top and the public class
// schedule below it, plus registration for students. The only business data
// fetched before login is the public class schedule (publicData) —
// everything else only happens after app/page.tsx sees a valid session.
// `initialRole` lets the /student, /teacher, /admin route shortcuts land
// with that role pre-selected in the dropdown.
export function AppShell({
  publicData,
  initialRole = "student",
}: {
  publicData: PublicScheduleData
  initialRole?: Exclude<Role, null>
}) {
  const { t } = useLanguage()
  const [role, setRole] = useState<Exclude<Role, null>>(initialRole)
  const [mode, setMode] = useState<"login" | "register">("login")

  if (mode === "register") {
    return <RegisterForm onBack={() => setMode("login")} />
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0">
        <img src="/studio-hero.png" alt="" className="h-full w-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-extrabold">
              A
            </div>
            <span className="font-display text-lg font-bold text-foreground">{t("brand.name")}</span>
          </div>
          <LanguageToggle />
        </header>

        <div className="flex flex-1 flex-col items-center gap-10 py-12">
          <LoginForm role={role} onRoleChange={setRole} onRegister={() => setMode("register")} />

          <div className="w-full rounded-3xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur">
            <PublicSchedule
              sessions={publicData.sessions}
              occurrences={publicData.occurrences}
              rooms={publicData.rooms}
              closures={publicData.closures}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
