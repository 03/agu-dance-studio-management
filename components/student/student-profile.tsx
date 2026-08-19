"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n"
import type { Student } from "@/lib/types"
import { updateMyProfile, changeMyPassword } from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { QrCode, ChevronRight, UserPen, KeyRound, HelpCircle } from "lucide-react"
import { QrPattern } from "@/components/shared/qr-pattern"

export function StudentProfile({
  me,
  upcomingCount,
  attendanceRate,
}: {
  me: Student
  upcomingCount: number
  attendanceRate: number
}) {
  const { t } = useLanguage()
  const [qrOpen, setQrOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)

  const menu = [
    { Icon: UserPen, label: t("stu.profile.edit"), onClick: () => setEditOpen(true) },
    { Icon: KeyRound, label: t("stu.profile.changePassword"), onClick: () => setPwOpen(true) },
    { Icon: HelpCircle, label: t("common.notes"), onClick: () => {} },
  ]

  return (
    <div>
      <header className="bg-primary px-4 pb-8 pt-6 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-primary-foreground/30">
            <AvatarFallback className="bg-primary-foreground/15 font-display text-lg font-bold text-primary-foreground">
              {me.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-lg font-bold">{me.name}</p>
            <span className="mt-1 inline-block rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px]">
              {t("stu.me.member")} · {me.joined}
            </span>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        <button
          onClick={() => setQrOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-accent to-accent/80 p-4 text-left text-accent-foreground shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-foreground/15">
            <QrCode className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-display text-base font-bold">{t("stu.qr.show")}</p>
            <p className="text-xs text-accent-foreground/80">{t("stu.qr.desc")}</p>
          </div>
          <ChevronRight className="h-5 w-5 opacity-70" />
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: t("stu.cards.balance"), value: String(me.totalBalance) },
            { label: t("stu.bookings.upcoming"), value: String(upcomingCount) },
            { label: t("tea.attendance"), value: `${attendanceRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="font-display text-xl font-extrabold text-card-foreground">{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {menu.map(({ Icon, label, onClick }) => (
            <li key={label}>
              <button
                onClick={onClick}
                className="flex w-full items-center gap-3 border-border px-4 py-3.5 text-left text-sm text-card-foreground [&:not(:last-child)]:border-b"
              >
                <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center font-display">{t("stu.qr.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className="rounded-3xl bg-card p-5 shadow-inner ring-1 ring-border">
              <QrPattern seed={`${me.id}-${me.joined}`} />
            </div>
            <div className="text-center">
              <p className="font-display text-base font-bold text-foreground">{me.name}</p>
              <p className="text-xs text-muted-foreground">{me.joined} · {t("stu.me.member")}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">{t("stu.qr.desc")}</p>
            <Button className="w-full" onClick={() => setQrOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <EditProfileForm me={me} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <ChangePasswordForm onClose={() => setPwOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditProfileForm({ me, onClose }: { me: Student; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(me.phone ?? "")
  const [wechat, setWechat] = useState(me.wechat ?? "")
  const [email, setEmail] = useState(me.email ?? "")
  const [error, setError] = useState<string | null>(null)

  const isValid = name.trim() !== "" && phone.trim() !== ""

  const handleConfirm = () => {
    if (!isValid || isPending) return
    setError(null)
    startTransition(async () => {
      const result = await updateMyProfile({ name, phone, wechat, email })
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("stu.profile.edit")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-2">
          <Label>{t("common.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{t("common.phone")}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("auth.wechat")}</Label>
            <Input value={wechat} onChange={(e) => setWechat(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("auth.email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid || isPending}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  )
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isValid = current !== "" && next.length >= 8

  const handleConfirm = () => {
    if (!isValid || isPending) return
    setError(null)
    if (next !== confirm) {
      setError("auth.passwordMismatch")
      return
    }
    startTransition(async () => {
      const result = await changeMyPassword(current, next)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{t("stu.profile.changePassword")}</DialogTitle>
      </DialogHeader>
      {success ? (
        <div className="py-4">
          <p className="text-sm text-foreground">{t("auth.passwordChanged")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("auth.currentPassword")}</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("auth.newPassword")}</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("auth.confirmPassword")}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{t(error)}</p>}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.close")}
        </Button>
        {!success && (
          <Button onClick={handleConfirm} disabled={!isValid || isPending}>
            {t("common.confirm")}
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
