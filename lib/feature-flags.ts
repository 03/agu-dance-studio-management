// Plain constants, not DB-backed — flipping one requires a code change and
// redeploy, which is deliberate: these are rare, studio-wide toggles (not
// per-user settings), and there's no admin UI for them.

// Self-service student registration, temporarily paused at the studio's
// request. Guarded in two places that must be kept in sync:
//   - components/app-shell.tsx hides the "还没有账号？立即注册" entry point
//   - lib/actions/auth.ts's `register` action refuses even a direct call
// Flip back to true to reopen sign-ups.
export const REGISTRATION_ENABLED = false

// Public homepage schedule's 月视图 toggle, temporarily hidden — only
// 周视图 shows. MonthView itself, and the toggle UI, are untouched and
// still there in components/public-schedule.tsx; this just keeps both from
// rendering. Flip back to true to bring the toggle and month view back.
export const PUBLIC_MONTH_VIEW_ENABLED = false
