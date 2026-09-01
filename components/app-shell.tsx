"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { PublicSchedule } from "@/components/public-schedule"
import type { PublicScheduleData } from "@/lib/data"
import { REGISTRATION_ENABLED } from "@/lib/feature-flags"

export type Role = "student" | "teacher" | "admin" | null

// Pre-authentication experience only: a single page with the login card on
// top and the public class schedule below it, plus registration for
// students. There's no role selector on the login card — the role is fixed
// by which URL brought the visitor here: "/" defaults to student (the
// common case), while teachers and admins get their own dedicated
// `initialRole` entry points (/teacher, /admin) to log in from instead.
// The only business data fetched before login is the public class schedule
// (publicData) — everything else only happens after app/page.tsx sees a
// valid session.
export function AppShell({
  publicData,
  initialRole = "student",
}: {
  publicData: PublicScheduleData
  initialRole?: Exclude<Role, null>
}) {
  const { t } = useLanguage()
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
          <img src="/logo-hero.png" alt={t("brand.name")} className="h-24 w-auto sm:h-28" />
          <LanguageToggle />
        </header>

        <div className="flex flex-1 flex-col items-center gap-10 py-12">
          <LoginForm role={initialRole} onRegister={REGISTRATION_ENABLED ? () => setMode("register") : undefined} />

          <div className="w-full rounded-3xl border border-border bg-card/50 p-6 shadow-xl backdrop-blur">
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
