"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { AdminOverview } from "./admin-overview"
import { AdminScheduling } from "./admin-scheduling"
import { AdminStudents } from "./admin-students"
import { AdminCards } from "./admin-cards"
import { AdminFinance } from "./admin-finance"
import { AdminNotifications } from "./admin-notifications"
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  CreditCard,
  LineChart,
  Bell,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Section = "overview" | "schedule" | "students" | "cards" | "finance" | "notifications"

const nav: { key: Section; labelKey: string; Icon: typeof LayoutDashboard }[] = [
  { key: "overview", labelKey: "adm.nav.overview", Icon: LayoutDashboard },
  { key: "schedule", labelKey: "adm.nav.schedule", Icon: CalendarRange },
  { key: "students", labelKey: "adm.nav.students", Icon: Users },
  { key: "cards", labelKey: "adm.nav.cards", Icon: CreditCard },
  { key: "finance", labelKey: "adm.nav.finance", Icon: LineChart },
  { key: "notifications", labelKey: "adm.nav.notifications", Icon: Bell },
]

export function AdminApp({ onExit }: { onExit: () => void }) {
  const { t } = useLanguage()
  const [section, setSection] = useState<Section>("overview")

  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">
            A
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-sidebar-foreground">{t("brand.name")}</p>
            <p className="text-[11px] text-muted-foreground">{t("adm.title")}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ key, labelKey, Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
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

        <button
          onClick={onExit}
          className="m-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("app.backHome")}
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h1 className="font-display text-xl font-bold text-foreground">
            {t(nav.find((n) => n.key === section)!.labelKey)}
          </h1>
          <div className="flex items-center gap-3">
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {section === "overview" && <AdminOverview />}
          {section === "schedule" && <AdminScheduling />}
          {section === "students" && <AdminStudents />}
          {section === "cards" && <AdminCards />}
          {section === "finance" && <AdminFinance />}
          {section === "notifications" && <AdminNotifications />}
        </main>
      </div>
    </div>
  )
}
