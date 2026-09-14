"use client"

import { useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { login } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { GraduationCap, Presentation, LayoutDashboard } from "lucide-react"

// One-click login for each of the seeded demo accounts (see prisma/seed.ts)
// — lets an ad visitor jump straight into the dashboard without typing the
// credentials shown just above. Only rendered in demo mode (app-shell.tsx).
const DEMO_ACCOUNTS = [
  { username: "student1", role: "STUDENT" as const, labelKey: "home.demo.tryStudent", Icon: GraduationCap },
  { username: "teacher1", role: "TEACHER" as const, labelKey: "home.demo.tryTeacher", Icon: Presentation },
  { username: "admin1", role: "ADMIN" as const, labelKey: "home.demo.tryAdmin", Icon: LayoutDashboard },
]

export function DemoQuickLogin() {
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()

  const handleClick = (username: string, role: (typeof DEMO_ACCOUNTS)[number]["role"]) => {
    startTransition(async () => {
      await login(username, "demo1234", role)
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {DEMO_ACCOUNTS.map(({ username, role, labelKey, Icon }) => (
        <Button
          key={username}
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleClick(username, role)}
          className="gap-1.5 bg-card/70"
        >
          <Icon className="h-3.5 w-3.5" />
          {t(labelKey)}
        </Button>
      ))}
    </div>
  )
}
