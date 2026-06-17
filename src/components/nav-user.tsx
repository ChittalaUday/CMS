"use client"

import type { Role } from "@/generated/prisma/enums"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import Link from "next/link"

export function NavUser({
  user,
}: {
  user: {
    name: string | null
    email: string
    role: Role
    avatarUrl?: string | null
  }
}) {
  const displayName = user.name || user.email.split("@")[0]
  const avatarUrl =
    user.avatarUrl ||
    `https://avatar.iran.liara.run/username?username=${encodeURIComponent(displayName)}`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/dashboard/settings">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="rounded-lg">
                {displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
