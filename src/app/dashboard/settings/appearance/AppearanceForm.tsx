"use client"

import { useTheme } from "next-themes"
import { Separator } from "@/components/ui/separator"
import { MonitorIcon, SunIcon, MoonIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACCENT_PRESETS, useAccentColor } from "@/hooks/use-accent-color"
import { useMounted } from "@/hooks/use-mounted"

const THEMES = [
  { value: "system", label: "System", description: "Follows your device preference", Icon: MonitorIcon },
  { value: "light",  label: "Light",  description: "Always light",                   Icon: SunIcon     },
  { value: "dark",   label: "Dark",   description: "Always dark",                    Icon: MoonIcon    },
] as const

export function AppearanceForm() {
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccentColor()
  // Avoid hydration mismatch — next-themes reads localStorage which isn't available on the server
  const mounted = useMounted()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Appearance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customise how the dashboard looks for you.
        </p>
      </div>
      <Separator className="border-border/40" />

      {/* Theme mode */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Theme
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
          {THEMES.map(({ value, label, description, Icon }) => {
            // Only show active state after mount to avoid server/client mismatch
            const active = mounted && theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/5 shadow-sm" : "border-border/60"
                )}
              >
                <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
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

      <Separator className="border-border/40" />

      {/* Primary color */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Primary Color
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sets the accent color used across buttons, links, and active states.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map(({ key, label, swatch }) => {
            const active = mounted && accent === key
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={`Set primary color to ${label}`}
                onClick={() => setAccent(key)}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/5 shadow-sm" : "border-border/60"
                )}
              >
                <span
                  className="size-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: swatch,
                    outline: active ? `2px solid ${swatch}` : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                >
                  {active && <CheckIcon className="size-3.5 text-white drop-shadow" />}
                </span>
                <span className={cn(
                  "text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Changes apply immediately and persist across sessions.</p>
      </div>
    </div>
  )
}
