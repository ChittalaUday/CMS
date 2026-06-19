"use client"

import * as React from "react"
import { useTransition } from "react"
import type { Role } from "@/generated/prisma/enums"
import { ADMIN_ROLES, BLOG_ACCESS_ROLES, CAREERS_ACCESS_ROLES, isDeveloper } from "@/lib/auth/roles"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  TerminalIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BookOpenIcon,
  ImageIcon,
  BriefcaseIcon,
  SettingsIcon,
  LogOutIcon,
  Building2,
} from "lucide-react"
import { logoutAction } from "@/app/_actions/auth"
import { toast } from "sonner"
import { ClientSwitcher } from "@/app/dashboard/clients/ClientSwitcher"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    id: string
    name: string | null
    email: string
    role: Role
    avatarUrl?: string | null
    clientId?: string | null
  }
  clients?: { id: string; name: string; slug: string }[]
  activeClientId?: string | null
  activeClientName?: string | null
}

export function AppSidebar({ user, clients = [], activeClientId = null, activeClientName = null, ...props }: AppSidebarProps) {
  const isAdmin = (ADMIN_ROLES as readonly Role[]).includes(user.role)
  const canAccessBlogs = (BLOG_ACCESS_ROLES as readonly Role[]).includes(user.role)
  const canAccessCareers = (CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)
  const isSuperAdmin = user.role === "SUPER_ADMIN"
  const isDevRole = isDeveloper(user.role)
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction()
        window.location.href = "/"
      } catch {
        toast.error("Failed to log out")
      }
    })
  }

  // DEVELOPER role: only Settings
  const navItems = isDevRole
    ? [
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: <SettingsIcon className="size-4" />,
        },
      ]
    : [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: <LayoutDashboardIcon className="size-4" />,
        },
        ...(isAdmin
          ? [
              {
                title: "User Management",
                url: "/dashboard/users",
                icon: <UsersIcon className="size-4" />,
              },
            ]
          : []),
        ...(canAccessBlogs
          ? [
              {
                title: "Blogs",
                url: "/dashboard/blogs",
                icon: <BookOpenIcon className="size-4" />,
              },
              {
                title: "Media Library",
                url: "/dashboard/media",
                icon: <ImageIcon className="size-4" />,
              },
            ]
          : []),
        ...(canAccessCareers
          ? [
              {
                title: "Careers",
                url: "/dashboard/careers",
                icon: <BriefcaseIcon className="size-4" />,
              },
            ]
          : []),
        ...(isSuperAdmin
          ? [
              {
                title: "DevTools",
                url: "#",
                icon: <TerminalIcon className="size-4" />,
                items: [{ title: "Queue", url: "/dashboard/careers/queue" }],
              },
            ]
          : []),
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: <SettingsIcon className="size-4" />,
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

        {/* Client section */}
        <SidebarMenu className="px-1 pt-1 pb-0.5 space-y-1">
          {isSuperAdmin ? (
            <>
              <SidebarMenuItem>
                <ClientSwitcher
                  clients={clients}
                  activeClientId={activeClientId}
                  activeClientName={activeClientName}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard/clients">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Manage Clients</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : activeClientName ? (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{activeClientName}</p>
                  <p className="text-[10px] text-muted-foreground">Your workspace</p>
                </div>
              </div>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter>
        {/* Logout nav item */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOutIcon className="size-4" />
              <span>{isPending ? "Logging out…" : "Log out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Profile card → clicks to settings */}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
