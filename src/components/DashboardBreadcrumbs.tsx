"use client"

import { usePathname } from "next/navigation"
import React from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const routeMap: Record<string, string> = {
  dashboard: "Dashboard",
  blogs: "Blogs",
  new: "New Post",
  edit: "Edit Post",
  media: "Media",
  users: "Users",
  careers: "Careers",
  settings: "Settings",
  appearance: "Appearance",
  profile: "Profile",
  account: "Account",
  queue: "Queue",
  applications: "Applications",
}

const getLabel = (segment: string) => {
  if (routeMap[segment]) return routeMap[segment]
  return segment
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()

  if (!pathname) return null

  const segments = pathname.split("/").filter(Boolean)
  const items: { label: string; href: string }[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isId = /^[0-9a-fA-F-]{8,24}$|^[0-9]+$/.test(segment) || (segment.length > 8 && !routeMap[segment])
    const href = "/" + segments.slice(0, i + 1).join("/")

    if (isId) {
      if (segments[i + 1] === "edit") {
        continue
      }
      items.push({ label: "Details", href })
    } else {
      items.push({ label: getLabel(segment), href })
    }
  }

  if (items.length === 0) return null

  const maxItems = 4

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.length <= maxItems ? (
          items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <React.Fragment key={item.href}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })
        ) : (
          <>
            {/* Show first item */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={items[0].href}>{items[0].label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {/* Ellipsis with Dropdown Menu for middle items */}
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center size-5 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer focus:outline-hidden">
                  <BreadcrumbEllipsis />
                  <span className="sr-only">Toggle menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-popover rounded-xl border border-border/60 p-1.5 shadow-md z-50">
                  {items.slice(1, -2).map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex w-full items-center px-2 py-1.5 text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {/* Show second-to-last item */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={items[items.length - 2].href}>{items[items.length - 2].label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {/* Show last item */}
            <BreadcrumbItem>
              <BreadcrumbPage>{items[items.length - 1].label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

