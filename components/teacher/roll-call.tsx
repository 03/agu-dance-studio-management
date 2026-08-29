"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useLanguage } from "@/lib/i18n"
import type { ClassSession, Room, RosterEntry } from "@/lib/types"
import { getRosterForSession, setCheckedIn, checkInByCode } from "@/lib/actions/rollcall"
import { parseISODate, formatAppDate } from "@/lib/schedule-dates"
import { StyleDot } from "@/components/shared/style-dot"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrScanner } from "@/components/shared/qr-scanner"
import { ChevronLeft, Check, UserCheck, ScanLine, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const SCAN_ERROR_KEY: Record<string, string> = {
  INVALID_CODE: "tea.scanErr.invalidCode",
  NOT_REGISTERED: "tea.scanErr.notRegistered",
}

export function RollCall({
  sessionId,
  date,
  sessions,
  rooms,
  onBack,
}: {
  sessionId: string
  date: string
  sessions: ClassSession[]
  rooms: Room[]
  onBack: () => void
}) {
  const { t, lang } = useLanguage()
  const session = sessions.find((s) => s.id === sessionId)!
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRosterForSession(sessionId, date).then((r) => {
      if (!cancelled) {
        setRoster(r)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, date])

  const checkedIn = roster.filter((r) => r.checkedIn).length
  const roomName = lang === "zh" ? rooms.find((x) => x.id === session.roomId)?.name : rooms.find((x) => x.id === session.roomId)?.nameEn

  const check = (id: string, proxy = false) => {
    const target = roster.find((r) => r.id === id)
    if (!target) return
    const nextCheckedIn = !target.checkedIn
    const nextProxy = nextCheckedIn ? proxy : false
    setRoster((prev) => prev.map((r) => (r.id === id ? { ...r, checkedIn: nextCheckedIn, proxy: nextProxy } : r)))
    startTransition(async () => {
      await setCheckedIn(id, nextCheckedIn, nextProxy)
    })
  }

  const [scannerOpen, setScannerOpen] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<{ type: "success"; name: string } | { type: "error"; key: string } | null>(
    null,
  )
  // Refs, not state — a scan fires many times per second while the same QR
  // code sits in frame, and neither value needs to trigger a re-render.
  const scanBusyRef = useRef(false)
  const lastScanRef = useRef<{ payload: string; at: number } | null>(null)

  const handleScan = useCallback(
    (payload: string) => {
      const now = Date.now()
      // Same code seen again within 3s of a completed scan — almost
      // certainly still the same QR code in frame, not a deliberate re-scan.
      if (lastScanRef.current && lastScanRef.current.payload === payload && now - lastScanRef.current.at < 3000) return
      if (scanBusyRef.current) return
      scanBusyRef.current = true
      startTransition(async () => {
        try {
          const result = await checkInByCode(sessionId, date, payload)
          setRoster((prev) =>
            prev.map((r) => (r.id === result.bookingId ? { ...r, checkedIn: true, proxy: false } : r)),
          )
          setScanFeedback({ type: "success", name: result.name })
        } catch (e) {
          const key = SCAN_ERROR_KEY[e instanceof Error ? e.message : ""] ?? "stu.schedule.err.generic"
          setScanFeedback({ type: "error", key })
        } finally {
          lastScanRef.current = { payload, at: Date.now() }
          scanBusyRef.current = false
          setTimeout(() => setScanFeedback(null), 1800)
        }
      })
    },
    [sessionId, date],
  )

  const closeScanner = () => {
    setScannerOpen(false)
    setCameraError(false)
    setScanFeedback(null)
  }

  return (
    <div>
      <div className="border-b border-border bg-card px-4 py-3">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("tea.mySchedule")}
        </button>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StyleDot style={session.style} />
            <span className="font-display text-lg font-bold text-card-foreground">{t(session.style)}</span>
          </div>
          <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => setScannerOpen(true)}>
            <ScanLine className="mr-1 h-3.5 w-3.5" />
            {t("tea.scanCheckIn")}
          </Button>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatAppDate(parseISODate(date))} · {session.start}–{session.end} · {roomName}
        </p>
      </div>

      {/* Attendance summary */}
      <div className="flex items-center justify-between bg-primary/5 px-4 py-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-primary">{checkedIn}</span>
          <span className="text-sm text-muted-foreground">/ {roster.length} {t("tea.checkedIn")}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {roster.length > 0 ? Math.round((checkedIn / roster.length) * 100) : 0}% {t("tea.attendance")}
        </span>
      </div>

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("common.loading")}…</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {roster.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  className={cn(
                    "text-sm font-semibold",
                    r.checkedIn ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {r.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{r.checkedIn ? (r.proxy ? t("tea.proxyCheckIn") : t("tea.checkedIn")) : t("tea.notCheckedIn")}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-medium",
                      r.remainingSessions <= 2
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {t("adm.attendance.remaining")} {r.remainingSessions}
                  </span>
                </p>
              </div>
              {r.checkedIn ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => check(r.id, true)}>
                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                    {t("tea.proxyCheckIn")}
                  </Button>
                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => check(r.id)}>
                    {t("tea.checkIn")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 border-t border-border bg-card p-4">
        <Button className="w-full" onClick={onBack}>
          {t("tea.finishClass")} · {checkedIn}/{roster.length}
        </Button>
      </div>

      <Dialog open={scannerOpen} onOpenChange={(o) => !o && closeScanner()}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center font-display">{t("tea.scanCheckIn")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pb-2">
            {cameraError ? (
              <p className="py-8 text-center text-sm text-destructive">{t("tea.scanErr.cameraDenied")}</p>
            ) : (
              <div className="relative w-full">
                <QrScanner active={scannerOpen} onScan={handleScan} onCameraError={() => setCameraError(true)} />
                {scanFeedback && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/90 backdrop-blur-sm">
                    {scanFeedback.type === "success" ? (
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                        <p className="font-display text-sm font-bold text-foreground">{scanFeedback.name}</p>
                        <p className="text-xs text-muted-foreground">{t("tea.scanSuccess")}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <XCircle className="h-8 w-8 text-destructive" />
                        <p className="text-xs text-destructive">{t(scanFeedback.key)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">{t("tea.scanHint")}</p>
            <Button variant="outline" className="w-full" onClick={closeScanner}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
