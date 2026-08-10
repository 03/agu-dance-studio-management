"use client"

import { useMemo } from "react"

// A deterministic decorative QR-like pattern generated from a seed string.
// Purely a visual placeholder for a real check-in QR code.
export function QrPattern({ seed, size = 176 }: { seed: string; size?: number }) {
  const grid = 21
  const cells = useMemo(() => {
    // simple deterministic hash -> pseudo-random bits
    let h = 2166136261
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const rand = () => {
      h ^= h << 13
      h ^= h >>> 17
      h ^= h << 5
      return ((h >>> 0) % 1000) / 1000
    }
    const out: boolean[] = []
    for (let i = 0; i < grid * grid; i++) out.push(rand() > 0.5)
    return out
  }, [seed])

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7
    return inBox(0, 0) || inBox(0, grid - 7) || inBox(grid - 7, 0)
  }
  const finderFilled = (r: number, c: number) => {
    const inRing = (br: number, bc: number) => {
      const lr = r - br
      const lc = c - bc
      if (lr < 0 || lr > 6 || lc < 0 || lc > 6) return false
      const border = lr === 0 || lr === 6 || lc === 0 || lc === 6
      const center = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4
      return border || center
    }
    return inRing(0, 0) || inRing(0, grid - 7) || inRing(grid - 7, 0)
  }

  return (
    <div
      className="grid"
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${grid}, 1fr)`,
        gridTemplateRows: `repeat(${grid}, 1fr)`,
      }}
      role="img"
      aria-label="Check-in QR code"
    >
      {Array.from({ length: grid * grid }).map((_, i) => {
        const r = Math.floor(i / grid)
        const c = i % grid
        const filled = isFinder(r, c) ? finderFilled(r, c) : cells[i]
        return (
          <span
            key={i}
            style={{ backgroundColor: filled ? "var(--foreground)" : "transparent" }}
          />
        )
      })}
    </div>
  )
}
