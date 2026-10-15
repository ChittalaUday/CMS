import { z } from "zod"

/** Client-safe (no server imports): shared by the site form, the server actions and the registry. */

export const RANGES = {
  "24h": { label: "24 hours", ms: 24 * 3600_000, unit: "hour" },
  "7d": { label: "7 days", ms: 7 * 86400_000, unit: "day" },
  "30d": { label: "30 days", ms: 30 * 86400_000, unit: "day" },
  "90d": { label: "90 days", ms: 90 * 86400_000, unit: "day" },
} as const
export type RangeKey = keyof typeof RANGES
export const DEFAULT_RANGE: RangeKey = "7d"

export const isRangeKey = (v: unknown): v is RangeKey => typeof v === "string" && v in RANGES

export function resolveRange(key: unknown, now = Date.now()) {
  const k = isRangeKey(key) ? key : DEFAULT_RANGE
  return { key: k, ...RANGES[k], startAt: now - RANGES[k].ms, endAt: now }
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/** "https://WWW.Example.com/path?x" -> "www.example.com" (Umami stores a bare hostname). */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
}

export const siteInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  domain: z
    .string()
    .transform(normalizeDomain)
    .refine((d) => HOSTNAME.test(d), "Enter a valid domain, e.g. example.com"),
})

export type AnalyticsSite = { name: string; domain: string; websiteId: string }

/** Reads `settings.analytics.sites` defensively: settings is a shared free-form JSON column. */
export function parseSites(settings: unknown): AnalyticsSite[] {
  const sites = (settings as { analytics?: { sites?: unknown } } | null)?.analytics?.sites
  if (!Array.isArray(sites)) return []
  return sites.filter(
    (s): s is AnalyticsSite =>
      !!s && typeof s.name === "string" && typeof s.domain === "string" && typeof s.websiteId === "string"
  )
}

/** Percent change for a stat card; null when there is nothing to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null
  const value = Math.round(((current - previous) / previous) * 100)
  return { value: Math.abs(value), direction: value > 0 ? ("up" as const) : value < 0 ? ("down" as const) : ("neutral" as const) }
}
