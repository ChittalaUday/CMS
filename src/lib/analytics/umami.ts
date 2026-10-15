import "server-only"

/**
 * Thin server-side client for the central Umami instance. The login token never leaves the server;
 * pages and actions call these helpers and pass plain data to the UI.
 */

export class UmamiError extends Error {}

export const isUmamiConfigured = () =>
  !!(process.env.UMAMI_URL && process.env.UMAMI_USERNAME && process.env.UMAMI_PASSWORD)

/** Public URL browsers load the tracker from (differs from UMAMI_URL, which is the internal address). */
export const umamiPublicUrl = () => (process.env.UMAMI_PUBLIC_URL ?? "").replace(/\/+$/, "")

const TIMEZONE = process.env.ANALYTICS_TIMEZONE ?? "Asia/Kolkata"
const TOKEN_TTL_MS = 30 * 60_000

let cached: { token: string; at: number } | null = null

const base = () => (process.env.UMAMI_URL ?? "").replace(/\/+$/, "")

async function login(): Promise<string> {
  if (!isUmamiConfigured()) throw new UmamiError("Analytics is not configured (UMAMI_* env vars).")
  const res = await fetch(`${base()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.UMAMI_USERNAME, password: process.env.UMAMI_PASSWORD }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new UmamiError(`Umami login failed (${res.status})`)
  const { token } = (await res.json()) as { token: string }
  cached = { token, at: Date.now() }
  return token
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = cached && Date.now() - cached.at < TOKEN_TTL_MS ? cached.token : await login()
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  if (res.status === 401 && retry) {
    cached = null
    return request<T>(path, init, false)
  }
  if (!res.ok) throw new UmamiError(`Umami request failed (${res.status})`)
  return res.json() as Promise<T>
}

type Window = { startAt: number; endAt: number }
const qs = (w: Window, extra: Record<string, string | number> = {}) =>
  new URLSearchParams({ startAt: String(w.startAt), endAt: String(w.endAt), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) }).toString()

export type SiteStats = {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
  comparison: { pageviews: number; visitors: number; visits: number; bounces: number; totaltime: number }
}
export type SeriesPoint = { x: string; y: number }
export type MetricRow = { x: string; y: number }
export type MetricType = "path" | "referrer" | "country" | "device"

export const getStats = (id: string, w: Window) => request<SiteStats>(`/api/websites/${id}/stats?${qs(w)}`)

export const getPageviews = (id: string, w: Window, unit: "hour" | "day") =>
  request<{ pageviews: SeriesPoint[]; sessions: SeriesPoint[] }>(
    `/api/websites/${id}/pageviews?${qs(w, { unit, timezone: TIMEZONE })}`
  )

export const getMetrics = (id: string, w: Window, type: MetricType, limit = 8) =>
  request<MetricRow[]>(`/api/websites/${id}/metrics?${qs(w, { type, limit })}`)

export const getActiveVisitors = (id: string) =>
  request<{ visitors: number }>(`/api/websites/${id}/active`).then((r) => r.visitors)

export const createWebsite = (name: string, domain: string) =>
  request<{ id: string; name: string; domain: string }>(`/api/websites`, {
    method: "POST",
    body: JSON.stringify({ name, domain }),
  })

/** Existing Umami website for a domain, so re-adding a site reuses its history instead of duplicating it. */
export const findWebsiteByDomain = (domain: string) =>
  request<{ data: { id: string; name: string; domain: string }[] }>(`/api/websites?pageSize=100`).then(
    (r) => r.data.find((w) => w.domain === domain) ?? null
  )
