import { readFileSync } from "fs"
import path from "path"

// Used to be a static public/sw.js — moved here so its content changes on
// every deploy. That's the whole point: the fetch handler is still a
// deliberate no-op (see below), but embedding the build id means the
// browser's own service-worker update check (a byte-for-byte diff of this
// file, done automatically on navigation) actually notices a new deploy.
// components/service-worker-register.tsx listens for the resulting
// `controllerchange` and reloads the page once, so a browser tab/installed
// app left open across a deploy doesn't silently keep running the old
// build indefinitely (see that file's own comment for the full mechanism).
function currentBuildId(): string {
  try {
    return readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf-8").trim()
  } catch {
    // next dev has no BUILD_ID file — fine, this only needs to change
    // between production deploys, not on every local edit.
    return "dev"
  }
}

// force-static: evaluated once at build time (this build's BUILD_ID baked
// in), not per-request — a fresh value every deploy, a stable one between
// deploys, exactly matching what the update check needs.
export const dynamic = "force-static"

export async function GET() {
  const body = `// build:${currentBuildId()}
// Deliberately does nothing but exist — Chrome/Android's install-banner
// criteria require an active service worker with a fetch handler, but this
// app is entirely live data (bookings, schedules, balances), so caching any
// of it would mean showing a student or admin something stale or wrong.
// Every request is just passed straight through to the network.
self.addEventListener("fetch", () => {})

// Take over immediately rather than waiting for every old tab to close —
// paired with service-worker-register.tsx's controllerchange listener,
// this is what turns "a new version was deployed" into "open tabs reload
// themselves" instead of silently running stale JS until manually closed.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
`
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // The service worker spec bypasses HTTP caching for its own update
      // check, but this makes sure nothing upstream (a CDN, Hostinger's own
      // static layer) serves a stale copy on a plain page load either.
      "Cache-Control": "no-cache",
    },
  })
}
