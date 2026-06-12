"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { TerminalIcon, LayoutDashboardIcon, UsersIcon, BookOpenIcon } from "lucide-react"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    id: string
    name: string | null
    email: string
    role: "SUPER_ADMIN" | "ADMIN" | "EDITOR"
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const isAuthorized = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
    },
    ...(isAuthorized
      ? [
          {
            title: "User Management",
            url: "/dashboard/users",
            icon: <UsersIcon className="size-4" />,
          },
        ]
      : []),
    {
      title: "Blogs",
      url: "/dashboard/blogs",
      icon: <BookOpenIcon className="size-4" />,
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">CMS Portal</span>
                  <span className="truncate text-xs">Admin Console</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
