"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserIcon, PaletteIcon, KeyRoundIcon } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard/settings/profile",    label: "Personal Info",          icon: UserIcon    },
  { href: "/dashboard/settings/appearance", label: "Appearance",             icon: PaletteIcon },
  { href: "/dashboard/settings/account",    label: "Account",                icon: KeyRoundIcon },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      {/* Nav links */}
      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
