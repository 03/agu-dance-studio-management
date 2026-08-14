"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { changePassword } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound } from "lucide-react"

export function ChangePasswordGate() {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("auth.passwordMismatch")
      return
    }
    startTransition(async () => {
      const result = await changePassword(password)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
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
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-card-foreground">{t("auth.mustChangePassword")}</p>
                <p className="text-xs text-muted-foreground">{t("auth.mustChangePasswordDesc")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{t(error)}</p>}

              <Button type="submit" className="mt-2 w-full" disabled={isPending}>
                {t("common.confirm")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
