"use client"

import { useEffect } from "react"

// Registers the no-op service worker (app/sw.js/route.ts) so Chrome/Android
// will offer the "add to home screen" install prompt — its own fetch
// handler never caches anything, see that file's comment for why.
//
// Beyond the install prompt, this also piggybacks on the browser's own
// service-worker update lifecycle to solve a real problem for an installed
// app: someone who leaves it open for days across a deploy would otherwise
// keep running the old build indefinitely, with no caching bug to blame —
// just an old JS bundle still sitting in memory (this is what produced the
// "Failed to find Server Action" errors after a redeploy). app/sw.js/route.ts
// embeds the current build id in its content, so a new deploy changes what
// the browser fetches there; skipWaiting()/clients.claim() (in that same
// file) make the new worker take over immediately instead of waiting for
// every old tab to close, which fires `controllerchange` here — and that's
// the signal to reload once, picking up the new deploy.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // A page's very first-ever visit (no service worker installed yet on
    // this device) also fires `controllerchange`, going from no controller
    // to one — that's not a stale build to refresh away from, so only arm
    // the reload if this page load was already being controlled by a prior
    // worker (i.e. a genuine update, not a first install).
    const hadController = !!navigator.serviceWorker.controller
    let registration: ServiceWorkerRegistration | null = null

    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => {
        registration = r
      })
      .catch(() => {
        // Best-effort — a failed registration just means no install prompt
        // and no auto-reload-on-update, not a broken app.
      })

    // Browsers only re-check /sw.js on navigation by default — an
    // installed app someone backgrounds for days (never fully closed)
    // would otherwise sit on an old version until they happen to relaunch
    // it. Re-check whenever the app comes back to the foreground instead,
    // so a deploy that happened while it was backgrounded is picked up
    // shortly after the next time it's actually looked at.
    const recheck = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {})
    }
    document.addEventListener("visibilitychange", recheck)
    window.addEventListener("focus", recheck)

    let reloaded = false
    const onControllerChange = () => {
      if (!hadController || reloaded) return
      reloaded = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    return () => {
      document.removeEventListener("visibilitychange", recheck)
      window.removeEventListener("focus", recheck)
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [])
  return null
}
