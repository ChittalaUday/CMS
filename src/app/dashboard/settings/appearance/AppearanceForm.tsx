"use client"

import { useTheme } from "next-themes"
import { Separator } from "@/components/ui/separator"
import { MonitorIcon, SunIcon, MoonIcon } from "lucide-react"

const THEMES = [
  { value: "system", label: "System", description: "Follows your device preference", Icon: MonitorIcon },
  { value: "light",  label: "Light",  description: "Always light",                   Icon: SunIcon     },
  { value: "dark",   label: "Dark",   description: "Always dark",                    Icon: MoonIcon    },
] as const

export function AppearanceForm() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Appearance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customise how the dashboard looks for you.
        </p>
      </div>
      <Separator className="border-border/40" />

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Theme
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
          {THEMES.map(({ value, label, description, Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60"
                  }`}
              >
                <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
                </div>
                {active && (
                  <span className="self-end text-[10px] font-bold uppercase tracking-wider text-primary">
                    Active
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Changes apply immediately.</p>
      </div>
    </div>
  )
}
