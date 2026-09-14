// Thin wrapper around the Stockfish WASM engine, loaded as a classic Web
// Worker from /public/stockfish (the single-threaded "lite" build — no
// SharedArrayBuffer/cross-origin-isolation headers needed, unlike the
// multi-threaded NNUE build, and still comfortably strong at any Elo in
// the range below). No "use client" here — this module has no React in
// it; it's only ever imported from client components.
//
// Runs entirely in the browser: no third-party API, no network calls once
// the engine file itself has loaded.

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js"
export const DEFAULT_ELO = 2200
// Stockfish's own reported UCI_Elo option range ("option name UCI_Elo type
// spin default 1320 min 1320 max 3190") — the student-facing rating picker
// (components/student/ai-practice.tsx) stays within this.
export const MIN_ELO = 1320
export const MAX_ELO = 3190

export type EngineMove = {
  from: string
  to: string
  promotion?: "q" | "r" | "b" | "n"
}

let worker: Worker | null = null
let readyPromise: Promise<void> | null = null
// Only one UCI command is ever in flight at a time (the init handshake is
// strictly sequential, and getBestMove is never called again before the
// previous call resolves) — so a single "current listener" slot is enough,
// no request-id queue needed.
let pendingLine: ((line: string) => void) | null = null

function handleMessage(line: string) {
  pendingLine?.(line)
}

function send(command: string) {
  worker!.postMessage(command)
}

// Resolves once a message line satisfies `match`. Only one waiter at a time.
function waitFor(match: (line: string) => boolean): Promise<string> {
  return new Promise((resolve) => {
    pendingLine = (line: string) => {
      if (match(line)) {
        pendingLine = null
        resolve(line)
      }
    }
  })
}

// Creates the worker and runs the one-time UCI handshake (engine identity,
// default strength, "ready" check). Memoized: safe to call on every mount
// of the AI-practice screen — after the first successful call it's a
// no-op. A failed attempt (e.g. the WASM file fails to load/instantiate)
// clears the memo so a later retry (student refreshes / reopens the tab)
// gets a fresh attempt instead of a permanently-rejected promise.
export function initEngine(): Promise<void> {
  if (readyPromise) return readyPromise
  readyPromise = new Promise<void>((resolve, reject) => {
    worker = new Worker(ENGINE_URL)
    worker.onmessage = (e: MessageEvent<string>) => handleMessage(e.data)
    worker.onerror = () => {
      pendingLine = null
      readyPromise = null
      reject(new Error("STOCKFISH_LOAD_FAILED"))
    }
    ;(async () => {
      const uciOk = waitFor((l) => l === "uciok")
      send("uci")
      await uciOk
      await applyElo(DEFAULT_ELO)
      send("ucinewgame")
      resolve()
    })().catch((e) => {
      readyPromise = null
      reject(e)
    })
  })
  return readyPromise
}

async function applyElo(elo: number): Promise<void> {
  // UCI_Elo is only honored once UCI_LimitStrength is turned on — without
  // it Stockfish plays at full strength (a crushing ~3000+, a bad
  // "sparring partner" regardless of what UCI_Elo is set to).
  send("setoption name UCI_LimitStrength value true")
  send(`setoption name UCI_Elo value ${Math.round(elo)}`)
  const readyOk = waitFor((l) => l === "readyok")
  send("isready")
  await readyOk
}

// Re-targets the engine's playing strength — called whenever the student
// picks a rating on the pre-game screen (components/student/ai-practice.tsx),
// before the first move of a game. Safe to call again mid-session (e.g. the
// student starts a new game at a different rating); each call fully
// replaces the previous UCI_Elo setting, it doesn't stack.
export async function setElo(elo: number): Promise<void> {
  await initEngine()
  const clamped = Math.min(MAX_ELO, Math.max(MIN_ELO, elo))
  await applyElo(clamped)
}

function parseUciMove(uci: string): EngineMove {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? (uci[4] as EngineMove["promotion"]) : undefined,
  }
}

// Asks the engine for its move in `fen` and waits up to `movetimeMs` for a
// reply. Caller must not call this in a position chess.js already
// considers game-over — the engine will report `bestmove (none)` if asked
// to move in a genuinely terminal position, surfaced here as a thrown
// error rather than a fabricated move.
export async function getBestMove(fen: string, movetimeMs: number): Promise<EngineMove> {
  await initEngine()
  const bestmove = waitFor((l) => l.startsWith("bestmove"))
  send(`position fen ${fen}`)
  send(`go movetime ${movetimeMs}`)
  const line = await bestmove
  const uci = line.split(" ")[1]
  if (!uci || uci === "(none)") throw new Error("NO_ENGINE_MOVE")
  return parseUciMove(uci)
}

export function terminateEngine(): void {
  worker?.terminate()
  worker = null
  readyPromise = null
  pendingLine = null
}
