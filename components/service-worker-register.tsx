"use client"

import { useEffect } from "react"

// Registers the no-op service worker (public/sw.js) so Chrome/Android will
// offer the "add to home screen" install prompt — its only job is to exist
// and handle `fetch`, see that file's own comment for why it never caches
// anything. Renders nothing; safe to mount unconditionally.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Best-effort — a failed registration just means no install
        // prompt, not a broken app.
      })
    }
  }, [])
  return null
}
