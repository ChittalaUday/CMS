"use client"

import { usePathname } from "next/navigation"
import React from "react"

const routeMap: Record<string, string> = {
  dashboard: "Dashboard",
  blogs: "Blogs",
  new: "New Post",
  edit: "Edit Post",
  media: "Media",
  users: "Users",
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  
  if (!pathname) return null

  const segments = pathname.split("/").filter(Boolean)

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const isId = /^[0-9a-fA-F-]{8,24}$|^[0-9]+$/.test(segment) || (segment.length > 8 && !routeMap[segment])
        
        if (isId) {
          if (segments[index + 1] === "edit") {
            return null
          }
          return (
            <React.Fragment key={segment}>
              <span className={isLast ? "font-medium text-foreground" : ""}>Details</span>
              {!isLast && <span className="text-muted-foreground/50">/</span>}
            </React.Fragment>
          )
        }

        const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

        return (
          <React.Fragment key={segment}>
            <span className={isLast ? "font-medium text-foreground" : ""}>
              {label}
            </span>
            {!isLast && segments[index + 1] !== "edit" && index < segments.length - 1 && (
              <span className="text-muted-foreground/50">/</span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
