"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { register } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, GraduationCap } from "lucide-react"

export function RegisterForm({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [wechat, setWechat] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isValid = name.trim() !== "" && phone.trim() !== "" && password.length >= 8

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isValid) return
    if (password !== confirm) {
      setError("auth.passwordMismatch")
      return
    }
    startTransition(async () => {
      const result = await register({ name, phone, wechat, email, password })
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
            <img src="/logo-mark.png" alt="" className="h-9 w-9 rounded-xl object-cover" aria-hidden="true" />
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
              {t("auth.login")}
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold text-card-foreground">{t("auth.register")}</span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t("common.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="wechat">{t("auth.wechat")}</Label>
                  <Input id="wechat" value={wechat} onChange={(e) => setWechat(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">{t("auth.password")}</Label>
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

              <Button type="submit" className="mt-2 w-full" disabled={!isValid || isPending}>
                {t("auth.register")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
