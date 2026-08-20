"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { AdminOverview } from "./admin-overview"
import { AdminScheduling } from "./admin-scheduling"
import { AdminAttendance } from "./admin-attendance"
import { AdminStudents } from "./admin-students"
import { AdminCards } from "./admin-cards"
import { AdminUsers } from "./admin-users"
import { AdminBackup } from "./admin-backup"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  CreditCard,
  ShieldCheck,
  DatabaseBackup,
  ClipboardList,
  ChevronLeft,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminAppData } from "@/lib/data"

type Section = "overview" | "schedule" | "attendance" | "students" | "cards" | "users" | "backup"

const nav: { key: Section; labelKey: string; Icon: typeof LayoutDashboard }[] = [
  { key: "overview", labelKey: "adm.nav.overview", Icon: LayoutDashboard },
  { key: "attendance", labelKey: "adm.nav.attendance", Icon: ClipboardList },
  { key: "students", labelKey: "adm.nav.students", Icon: Users },
  { key: "cards", labelKey: "adm.nav.cards", Icon: CreditCard },
  { key: "schedule", labelKey: "adm.nav.schedule", Icon: CalendarRange },
  { key: "users", labelKey: "adm.nav.users", Icon: ShieldCheck },
  { key: "backup", labelKey: "adm.nav.backup", Icon: DatabaseBackup },
]

export function AdminApp({
  data,
  onExit,
}: {
  data: AdminAppData
  onExit: () => void | Promise<void>
}) {
  const { t } = useLanguage()
  const [section, setSection] = useState<Section>("overview")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const brand = (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">
        A
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold text-sidebar-foreground">{t("brand.name")}</p>
        <p className="text-[11px] text-muted-foreground">{t("adm.title")}</p>
      </div>
    </div>
  )

  const navList = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {nav.map(({ key, labelKey, Icon }) => (
        <button
          key={key}
          onClick={() => {
            setSection(key)
            onNavigate?.()
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            section === key
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
          {t(labelKey)}
        </button>
      ))}
    </nav>
  )

  const exitButton = (
    <Button variant="destructive" className="m-3 justify-start" onClick={onExit}>
      <ChevronLeft className="h-4 w-4" />
      {t("app.backHome")}
    </Button>
  )

  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* Sidebar — desktop only; mobile uses the Sheet drawer below */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        {brand}
        {navList()}
        {exitButton}
      </aside>

      {/* Mobile nav drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex flex-col bg-sidebar p-0">
          <SheetTitle className="sr-only">{t("adm.title")}</SheetTitle>
          {brand}
          {navList(() => setMobileNavOpen(false))}
          {exitButton}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-foreground hover:bg-secondary md:hidden"
              aria-label={t("adm.title")}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-foreground">
              {t(nav.find((n) => n.key === section)!.labelKey)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {section === "overview" && (
            <AdminOverview
              admin={data.admin}
              teachers={data.teachers}
              cashFlow={data.cashFlow}
              sessionStats={data.sessionStats}
            />
          )}
          {section === "schedule" && (
            <AdminScheduling
              teachers={data.teachers}
              rooms={data.rooms}
              sessions={data.sessions}
              studios={data.studios}
            />
          )}
          {section === "attendance" && (
            <AdminAttendance sessions={data.sessions} teachers={data.teachers} students={data.students} />
          )}
          {section === "students" && (
            <AdminStudents students={data.students} cardProducts={data.cardProducts} />
          )}
          {section === "cards" && <AdminCards cardProducts={data.cardProducts} cashier={data.cashier} />}
          {section === "users" && <AdminUsers users={data.users} />}
          {section === "backup" && <AdminBackup backupRecords={data.backupRecords} />}
        </main>
      </div>
    </div>
  )
}
