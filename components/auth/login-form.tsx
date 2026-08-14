"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { login } from "@/lib/actions/auth"
import { userRoleKeyToDb } from "@/lib/mappers"
import type { Role } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, GraduationCap, Presentation, LayoutDashboard } from "lucide-react"

const roleMeta: Record<Exclude<Role, null>, { titleKey: string; Icon: typeof GraduationCap }> = {
  student: { titleKey: "role.student", Icon: GraduationCap },
  teacher: { titleKey: "role.teacher", Icon: Presentation },
  admin: { titleKey: "role.admin", Icon: LayoutDashboard },
}

export function LoginForm({
  role,
  onBack,
  onRegister,
}: {
  role: Exclude<Role, null>
  onBack: () => void
  onRegister?: () => void
}) {
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { titleKey, Icon } = roleMeta[role]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await login(username, password, userRoleKeyToDb(role))
      if (result?.error) setError(result.error)
    })
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

        <div className="flex flex-1 items-center justify-center py-12">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-3xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur"
          >
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("app.selectRole")}
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold text-card-foreground">{t(titleKey)}</span>
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

              {onRegister && (
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
        </div>
      </div>
    </main>
  )
}
