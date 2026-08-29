"use client"

import { useEffect, useRef } from "react"
import jsQR from "jsqr"

// Live camera QR scanner. Decodes every frame via jsQR on an offscreen
// canvas — no native BarcodeDetector dependency, so it works the same way
// in every browser. Keeps the stream running continuously while `active`;
// callers debounce repeat scans of the same code themselves (see
// roll-call.tsx) rather than this component pausing/restarting the camera
// per scan, which would flicker and re-trigger the permission UI on some
// browsers.
export function QrScanner({
  onScan,
  onCameraError,
  active,
}: {
  onScan: (payload: string) => void
  onCameraError: () => void
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const onScanRef = useRef(onScan)
  const onCameraErrorRef = useRef(onCameraError)

  useEffect(() => {
    onScanRef.current = onScan
    onCameraErrorRef.current = onCameraError
  }, [onScan, onCameraError])

  useEffect(() => {
    if (!active) return
    let cancelled = false

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const result = jsQR(imageData.data, imageData.width, imageData.height)
          if (result?.data) onScanRef.current(result.data)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.play().then(tick)
        }
      })
      .catch(() => {
        if (!cancelled) onCameraErrorRef.current()
      })

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [active])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
