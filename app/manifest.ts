import type { MetadataRoute } from "next"

// Makes the site installable as a home-screen app (PWA) — Android's
// install banner reads this manifest (plus a registered service worker,
// see public/sw.js + components/service-worker-register.tsx) to decide
// whether to offer the "add to home screen" prompt; iOS Safari reads the
// name/icons for its own "Add to Home Screen" flow directly, no service
// worker required there. This is deliberately a thin shell around the live
// site, not an offline-first app: the service worker never caches
// anything, since stale booking/schedule data would be actively wrong for
// this app's use case (see its own comment).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "国际象棋教学预约系统",
    short_name: "棋艺预约",
    description: "私教课程、锦标赛报名、课时卡包、教练排课与运营报表一体化管理平台",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c2fd6",
    lang: "zh",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
