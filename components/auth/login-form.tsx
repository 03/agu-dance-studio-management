"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { login } from "@/lib/actions/auth"
import { userRoleKeyToDb } from "@/lib/mappers"
import type { Role } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Presentation, LayoutDashboard } from "lucide-react"

type NonNullRole = Exclude<Role, null>

const roleMeta: Record<NonNullRole, { titleKey: string; Icon: typeof GraduationCap }> = {
  student: { titleKey: "role.student", Icon: GraduationCap },
  teacher: { titleKey: "role.teacher", Icon: Presentation },
  admin: { titleKey: "role.admin", Icon: LayoutDashboard },
}

const roleOrder: NonNullRole[] = ["student", "teacher", "admin"]

// Just the login card (no page chrome — header/hero background live in
// AppShell, which places this alongside the public schedule on one page).
export function LoginForm({
  role,
  onRoleChange,
  onRegister,
}: {
  role: NonNullRole
  onRoleChange: (r: NonNullRole) => void
  onRegister?: () => void
}) {
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { Icon } = roleMeta[role]

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
        <span className="font-display text-xl font-bold text-card-foreground">{t("auth.login")}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label>{t("app.selectRole")}</Label>
          <Select value={role} onValueChange={(v) => onRoleChange(v as NonNullRole)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: NonNullRole) => t(roleMeta[v].titleKey)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roleOrder.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(roleMeta[r].titleKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>
    </form>
  )
}
