// Split out from lib/db.ts so one-off scripts run via plain `tsx` (prisma
// db seed, scripts/batch-create-student-logins.ts) can import just this —
// this file is deliberately synchronous, no top-level `await` anywhere in
// it or anything it imports. lib/db.ts itself now has a top-level await
// (DNS pre-resolution, see its own comment) and can only safely be loaded
// through Next's own always-ESM bundler; importing anything from it at all
// — even just this function — forces a full module evaluation, which
// breaks outright under tsx's plain-script CJS transform (this project has
// no "type": "module"), since CJS doesn't support top-level await at all.

// mariadb's PoolConfig doesn't parse a `mysql://` URL itself the way
// pg's connectionString option does — it wants host/user/password/database
// broken out. Small hand-rolled parse rather than a new dependency, since
// this only ever needs to handle the plain `mysql://user:pass@host:port/db`
// shape this app's own .env actually uses.
export function parseConnectionString(url: string | undefined) {
  if (!url) throw new Error("DATABASE_URL is not set")
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  }
}
