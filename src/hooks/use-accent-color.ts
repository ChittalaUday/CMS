"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "accent-color"
export const DEFAULT_ACCENT = "default"
const STYLE_ID = "cms-accent-style"

export const ACCENT_PRESETS = [
  { key: "default", label: "Default", swatch: "#18181b" },
  { key: "blue",    label: "Blue",    swatch: "#3b82f6" },
  { key: "violet",  label: "Violet",  swatch: "#7c3aed" },
  { key: "rose",    label: "Rose",    swatch: "#f43f5e" },
  { key: "orange",  label: "Orange",  swatch: "#f97316" },
  { key: "green",   label: "Green",   swatch: "#16a34a" },
  { key: "teal",    label: "Teal",    swatch: "#0d9488" },
  { key: "pink",    label: "Pink",    swatch: "#db2777" },
] as const

export type AccentKey = (typeof ACCENT_PRESETS)[number]["key"]

// light: used when <html> does NOT have .dark class
// dark:  used when <html> has .dark class
// fg:    foreground color (text on primary bg)
const ACCENT_CSS: Record<string, { l: string; lf: string; d: string; df: string }> = {
  blue:   { l: "oklch(0.488 0.243 264.4)", lf: "oklch(0.985 0 0)", d: "oklch(0.623 0.214 259.8)", df: "oklch(0.985 0 0)" },
  violet: { l: "oklch(0.541 0.281 293.0)", lf: "oklch(0.985 0 0)", d: "oklch(0.702 0.183 293.0)", df: "oklch(0.985 0 0)" },
  rose:   { l: "oklch(0.563 0.226 13.0)",  lf: "oklch(0.985 0 0)", d: "oklch(0.704 0.191 22.2)",  df: "oklch(0.985 0 0)" },
  orange: { l: "oklch(0.646 0.222 41.8)",  lf: "oklch(0.985 0 0)", d: "oklch(0.769 0.188 70.1)",  df: "oklch(0.145 0 0)" },
  green:  { l: "oklch(0.527 0.154 150.1)", lf: "oklch(0.985 0 0)", d: "oklch(0.696 0.17 162.4)",  df: "oklch(0.145 0 0)" },
  teal:   { l: "oklch(0.511 0.14 194.8)",  lf: "oklch(0.985 0 0)", d: "oklch(0.682 0.144 196.5)", df: "oklch(0.145 0 0)" },
  pink:   { l: "oklch(0.592 0.249 351.0)", lf: "oklch(0.985 0 0)", d: "oklch(0.718 0.202 349.8)", df: "oklch(0.985 0 0)" },
}

export function buildAccentCSS(key: string): string {
  const c = ACCENT_CSS[key]
  if (!c) return ""
  const vars = (p: string, pf: string) =>
    `--primary:${p};--primary-foreground:${pf};--ring:${p};--sidebar-primary:${p};--sidebar-primary-foreground:${pf}`
  return `:root{${vars(c.l, c.lf)}}.dark{${vars(c.d, c.df)}}`
}

export function applyAccent(key: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (key === DEFAULT_ACCENT) {
    el?.remove()
    return
  }
  const css = buildAccentCSS(key)
  if (!css) return
  if (!el) {
    el = document.createElement("style")
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = css
}

export function useAccentColor() {
  const [accent, setAccentState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT
    } catch {
      return DEFAULT_ACCENT
    }
  })

  // Sync the <style> tag with React state — external DOM mutation, must live in an effect.
  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  const setAccent = useCallback((key: string) => {
    setAccentState(key)
    localStorage.setItem(STORAGE_KEY, key)
  }, [])

  return { accent, setAccent }
}
