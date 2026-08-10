"use client"

import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => setLang("zh")}
        className={cn(
          "rounded-full px-3 py-1 transition-colors",
          lang === "zh" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={lang === "zh"}
      >
        中文
      </button>
      <button
        onClick={() => setLang("en")}
        className={cn(
          "rounded-full px-3 py-1 transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  )
}
