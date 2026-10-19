"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  clients: { id: string; name: string }[]
  value: string
  onChange: (clientId: string) => void
  disabled?: boolean
  className?: string
}

/** Client picker for records being created. Renders nothing when `clients` is empty (everyone but a super admin). */
export function ClientSelect({ clients, value, onChange, disabled, className }: Props) {
  if (clients.length === 0) return null
  return (
    <div className={className ?? "space-y-2"}>
      <Label className="text-xs font-semibold text-muted-foreground">Client</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
