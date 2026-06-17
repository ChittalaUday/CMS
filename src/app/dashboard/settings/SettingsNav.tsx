"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserIcon, PaletteIcon, KeyRoundIcon } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard/settings/profile",    label: "Personal Info",          icon: UserIcon    },
  { href: "/dashboard/settings/appearance", label: "Appearance",             icon: PaletteIcon },
  { href: "/dashboard/settings/account",    label: "Account",                icon: KeyRoundIcon },
]

interface SettingsNavProps {
  avatarUrl: string
  displayName: string
  initials: string
  email: string
}

export function SettingsNav({ avatarUrl, displayName, initials, email }: SettingsNavProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      {/* Mini profile card */}
      <div className="flex flex-row md:flex-col items-center md:items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="size-10 md:size-14 rounded-full object-cover border-2 border-border/60 shadow shrink-0"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="size-10 md:size-14 rounded-full bg-primary/10 border-2 border-border/60 flex items-center justify-center text-primary font-bold text-sm md:text-base shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{email}</p>
        </div>
      </div>

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
