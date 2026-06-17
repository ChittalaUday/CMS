"use client"

import * as React from "react"
import { useTransition } from "react"
import type { Role } from "@/generated/prisma/enums"
import { ADMIN_ROLES, BLOG_ACCESS_ROLES, CAREERS_ACCESS_ROLES } from "@/lib/roles"
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
import {
  TerminalIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BookOpenIcon,
  ImageIcon,
  BriefcaseIcon,
  SettingsIcon,
  LogOutIcon,
  Activity,
} from "lucide-react"
import { logoutAction } from "@/app/_actions/auth"
import { toast } from "sonner"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    id: string
    name: string | null
    email: string
    role: Role
    avatarUrl?: string | null
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const isAdmin = (ADMIN_ROLES as readonly Role[]).includes(user.role)
  const canAccessBlogs = (BLOG_ACCESS_ROLES as readonly Role[]).includes(user.role)
  const canAccessCareers = (CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)
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

  const navItems = [
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
    ...(user.role === "SUPER_ADMIN"
      ? [
          {
            title: "DevTools",
            url: "#",
            icon: <TerminalIcon className="size-4" />,
            items: [
              {
                title: "Queue",
                url: "/dashboard/careers/queue",
              },
            ],
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
