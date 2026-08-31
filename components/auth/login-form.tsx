"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"
import { login } from "@/lib/actions/auth"
import { userRoleKeyToDb } from "@/lib/mappers"
import type { Role } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, Presentation, LayoutDashboard } from "lucide-react"

type NonNullRole = Exclude<Role, null>

// loginTitleKey is deliberately separate from role.* (used for the small
// cross-role icon links below) — the heading names the action ("教师登录"),
// the icon link's title/aria-label names the destination ("教师").
const roleMeta: Record<NonNullRole, { titleKey: string; loginTitleKey: string; href: string; Icon: typeof GraduationCap }> = {
  student: { titleKey: "role.student", loginTitleKey: "auth.login", href: "/", Icon: GraduationCap },
  teacher: { titleKey: "role.teacher", loginTitleKey: "auth.teacherLogin", href: "/teacher", Icon: Presentation },
  admin: { titleKey: "role.admin", loginTitleKey: "auth.adminLogin", href: "/admin", Icon: LayoutDashboard },
}
const roleOrder: NonNullRole[] = ["student", "teacher", "admin"]

// Just the login card (no page chrome — header/hero background live in
// AppShell, which places this alongside the public schedule on one page).
// The role isn't picked here — it's fixed by which entry point brought the
// visitor here (student.agustudio.au / "/" defaults to student; teachers
// and admins use their own /teacher, /admin links) — so there's no role
// selector cluttering the common case.
export function LoginForm({
  role,
  onRegister,
}: {
  role: NonNullRole
  onRegister?: () => void
}) {
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { Icon, loginTitleKey } = roleMeta[role]
  const otherRoles = roleOrder.filter((r) => r !== role)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await login(username, password, userRoleKeyToDb(role))
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-3xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-display text-xl font-bold text-card-foreground">{t(loginTitleKey)}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">{t("auth.username")}</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{t(error)}</p>}

        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {t("auth.login")}
        </Button>

        {role === "student" && onRegister && (
          <button
            type="button"
            onClick={onRegister}
            className="text-center text-sm font-medium text-primary hover:underline"
          >
            {t("auth.noAccount")}
          </button>
        )}

        {/* Low-key entry points to the other two roles' logins —
            deliberately small and muted so they don't compete with whichever
            role's flow is in front (the common case for that entry point). */}
        <div className="flex items-center justify-center gap-5">
          {otherRoles.map((r) => {
            const OtherIcon = roleMeta[r].Icon
            return (
              <Link
                key={r}
                href={roleMeta[r].href}
                title={t(roleMeta[r].titleKey)}
                aria-label={t(roleMeta[r].titleKey)}
                className="text-muted-foreground/40 transition-colors hover:text-muted-foreground"
              >
                <OtherIcon className="h-3.5 w-3.5" />
              </Link>
            )
          })}
        </div>
      </div>
    </form>
  )
}
