"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

// A real, scannable QR code (unlike the old qr-pattern.tsx placeholder it
// replaced) — encodes `value` and renders it as a data-URL <img>. Generation
// runs client-side via the `qrcode` package, which is fast enough (a few ms
// for this payload size) that a loading flash isn't worth avoiding.
export function QrCodeImage({ value, size = 176 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    return <div className="animate-pulse rounded-lg bg-secondary" style={{ width: size, height: size }} />
  }
  return <img src={dataUrl} alt="Check-in QR code" width={size} height={size} />
}
