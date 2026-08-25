import { getSession } from "@/lib/auth"
import { getPublicScheduleData } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { renderAuthenticatedApp } from "@/lib/session-app"

// Shortcut straight to the student login form. If a session already exists
// (of any role), it takes over exactly as it would on "/" — this route
// only changes which login form a signed-out visitor lands on.
export default async function StudentEntryPage() {
  const session = await getSession()
  if (session) {
    const app = await renderAuthenticatedApp(session)
    if (app) return app
  }
  const publicData = await getPublicScheduleData()
  return <AppShell publicData={publicData} initialRole="student" />
}
