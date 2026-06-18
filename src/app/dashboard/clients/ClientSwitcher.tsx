"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Building2, Globe } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { setActiveClient } from "./switcher-actions"

type Client = { id: string; name: string; slug: string }

type Props = {
  clients: Client[]
  activeClientId: string | null
  activeClientName: string | null
}

export function ClientSwitcher({ clients, activeClientId, activeClientName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSelect(clientId: string | null) {
    setOpen(false)
    startTransition(async () => {
      await setActiveClient(clientId)
      router.refresh()
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-sm"
          disabled={pending}
        >
          <div className="flex items-center gap-2 truncate">
            {activeClientId ? (
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{activeClientName ?? "All Clients"}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1" align="start">
        {/* All Clients option */}
        <button
          onClick={() => handleSelect(null)}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
            !activeClientId && "font-medium"
          )}
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left">All Clients</span>
          {!activeClientId && <Check className="h-4 w-4 text-emerald-500" />}
        </button>

        {clients.length > 0 && (
          <div className="my-1 border-t" />
        )}

        {clients.map((client) => (
          <button
            key={client.id}
            onClick={() => handleSelect(client.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
              activeClientId === client.id && "font-medium"
            )}
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left truncate">{client.name}</span>
            {activeClientId === client.id && <Check className="h-4 w-4 text-emerald-500" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
