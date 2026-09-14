import { categoryColors, type CategoryKey } from "@/lib/types"

export function CategoryDot({ category, size = 10 }: { category: CategoryKey; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: categoryColors[category] }}
      aria-hidden="true"
    />
  )
}
