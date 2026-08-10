"use client"

import type { ReactNode } from "react"

// A phone-shaped frame used to present the student & teacher mobile apps on desktop.
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative overflow-hidden rounded-[2.5rem] border-8 border-foreground/90 bg-background shadow-2xl shadow-primary/10">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
        <div className="relative h-[720px] overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
