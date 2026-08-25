"use client"

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export function SortableHead<Field extends string>({
  field,
  label,
  sort,
  onSort,
  className,
}: {
  field: Field
  label: string
  sort: { field: Field; dir: "asc" | "desc" }
  onSort: (field: Field) => void
  className?: string
}) {
  const active = sort.field === field
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}
