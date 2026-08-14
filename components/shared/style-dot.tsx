import { styleColors, type StyleKey } from "@/lib/types"

export function StyleDot({ style, size = 10 }: { style: StyleKey; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: styleColors[style] }}
      aria-hidden="true"
    />
  )
}
