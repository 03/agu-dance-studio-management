"use client"

import type { Role } from "@/components/app-shell"
import type { PublicScheduleData } from "@/lib/data"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { PublicSchedule } from "@/components/public-schedule"
import { GraduationCap, Presentation, LayoutDashboard, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const roles: {
  key: Exclude<Role, null>
  titleKey: string
  descKey: string
  Icon: typeof GraduationCap
}[] = [
  { key: "student", titleKey: "role.student", descKey: "role.student.desc", Icon: GraduationCap },
  { key: "teacher", titleKey: "role.teacher", descKey: "role.teacher.desc", Icon: Presentation },
  { key: "admin", titleKey: "role.admin", descKey: "role.admin.desc", Icon: LayoutDashboard },
]

export function RoleSwitcher({
  onSelect,
  publicData,
}: {
  onSelect: (r: Role) => void
  publicData: PublicScheduleData
}) {
  const { t } = useLanguage()

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Hero background */}
      <div className="absolute inset-0">
        <img
          src="/studio-hero.png"
          alt=""
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
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

        <div className="flex flex-1 flex-col justify-center py-12">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {t("brand.tagline")}
          </p>
          <h1 className="max-w-2xl text-balance font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
            {t("app.selectRole")}
          </h1>
          <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
            {t("app.selectRoleDesc")}
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {roles.map(({ key, titleKey, descKey, Icon }, i) => (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className={cn(
                  "group relative flex flex-col items-start rounded-3xl border border-border bg-card/80 p-6 text-left backdrop-blur transition-all",
                  "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
                )}
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mb-1 flex items-center gap-1 font-display text-2xl font-bold text-card-foreground">
                  0{i + 1}
                </span>
                <span className="font-display text-lg font-bold text-card-foreground">{t(titleKey)}</span>
                <span className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {t("app.enter")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      </main>
      <PublicSchedule sessions={publicData.sessions} teachers={publicData.teachers} rooms={publicData.rooms} />
    </>
  )
}
