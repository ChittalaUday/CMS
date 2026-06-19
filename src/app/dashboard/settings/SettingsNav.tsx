"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserIcon, PaletteIcon, KeyRoundIcon, ShieldIcon, ServerIcon, FileCodeIcon } from "lucide-react"
import { type Role, Role as RoleEnum } from "@/lib/auth/roles"

const BASE_NAV_ITEMS = [
  { href: "/dashboard/settings/profile",    label: "Personal Info", icon: UserIcon    },
  { href: "/dashboard/settings/appearance", label: "Appearance",    icon: PaletteIcon },
  { href: "/dashboard/settings/account",    label: "Account",       icon: KeyRoundIcon },
  { href: "/dashboard/api-docs",            label: "API Docs",      icon: FileCodeIcon },
]

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard/settings/api-tokens", label: "API Tokens",   icon: ShieldIcon  },
]

const SUPER_ADMIN_NAV_ITEMS = [
  { href: "/dashboard/settings/system",     label: "System",        icon: ServerIcon  },
]

export function SettingsNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const navItems =
    role === RoleEnum.SUPER_ADMIN
      ? [...BASE_NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS]
      : role === RoleEnum.ADMIN
      ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : BASE_NAV_ITEMS

  return (
    <div className="space-y-4">
      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
        {navItems.map(({ href, label, icon: Icon }) => {
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
