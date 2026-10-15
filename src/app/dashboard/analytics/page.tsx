import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, BarChart3, Clock, Eye, MousePointerClick, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession } from "@/lib/auth/session"
import { ADMIN_ROLES, type Role } from "@/lib/auth/roles"
import { getClientScope } from "@/lib/utils/client-context"
import { RANGES, percentChange, resolveRange, type AnalyticsSite, type RangeKey } from "@/lib/analytics/schema"
import { getClientSites, listAllClientSites } from "@/lib/analytics/sites"
import logger from "@/lib/utils/logger"
import {
  ANALYTICS_TIMEZONE,
  getActiveVisitors,
  getMetrics,
  getPageviews,
  getStats,
  isUmamiConfigured,
  umamiPublicUrl,
  type MetricRow,
} from "@/lib/analytics/umami"
import { StatCard } from "../_widgets/StatCard"
import { BreakdownCard } from "./BreakdownCard"
import { SitesManager } from "./SitesManager"
import { TrafficChart, type TrafficPoint } from "./TrafficChart"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ site?: string; range?: string }>
}

const href = (site: string | undefined, range: RangeKey) => {
  const q = new URLSearchParams({ range })
  if (site) q.set("site", site)
  return `/dashboard/analytics?${q.toString()}`
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })
const countryName = (code: string) => {
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

const duration = (seconds: number) =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)}s`

const rows = (data: MetricRow[], fallback: string, label: (x: string) => string = (x) => x) =>
  data.map((d) => ({ label: d.x ? label(d.x) : fallback, value: d.y }))

/** Umami calls must not take the page down, but failures are logged so a bad password or id is diagnosable. */
const guarded = <T,>(p: Promise<T>, what: string): Promise<T | null> =>
  p.catch((err) => {
    logger.error({ err, what }, "analytics request failed")
    return null
  })

function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-[300px] rounded-2xl border border-dashed border-border/80 bg-muted/10 flex flex-col justify-center items-center text-center p-8">
      <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <BarChart3 className="size-7 text-muted-foreground/60" />
      </div>
      <h2 className="text-lg font-bold mb-1.5 text-foreground">{title}</h2>
      <div className="text-muted-foreground max-w-md text-sm">{children}</div>
    </div>
  )
}

function Pills<T extends string>({ items, current, build }: { items: { key: T; label: string }[]; current: T | undefined; build: (k: T) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Button key={i.key} asChild size="sm" variant={i.key === current ? "default" : "outline"} className="h-8 text-xs">
          <Link href={build(i.key)} aria-current={i.key === current ? "page" : undefined}>{i.label}</Link>
        </Button>
      ))}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")

  const params = await searchParams
  const range = resolveRange(params.range)
  const canManage = (ADMIN_ROLES as readonly Role[]).includes(user.role)

  const header = (right?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm max-w-xl">Traffic for your websites, collected centrally across all clients.</p>
      </div>
      {right}
    </div>
  )

  if (!isUmamiConfigured()) {
    return (
      <div className="space-y-5 w-full px-1 py-3">
        {header()}
        <Empty title="Analytics isn't connected">
          Set <code className="font-mono text-xs">UMAMI_URL</code>, <code className="font-mono text-xs">UMAMI_USERNAME</code> and{" "}
          <code className="font-mono text-xs">UMAMI_PASSWORD</code> in the server environment, then reload.
        </Empty>
      </div>
    )
  }

  const clientId = await getClientScope()
  const trackerUrl = umamiPublicUrl()
  const groups = clientId
    ? [{ client: { id: clientId, name: "" }, sites: await getClientSites(clientId) }]
    : await listAllClientSites()
  const sites = groups.flatMap((g) => g.sites)
  // Only sites the viewer is allowed to see can be queried: a made-up ?site= id never reaches Umami.
  const selected = sites.find((s) => s.websiteId === params.site) ?? (clientId ? sites[0] : undefined)

  const rangePills = (
    <Pills
      items={(Object.keys(RANGES) as RangeKey[]).map((k) => ({ key: k, label: RANGES[k].label }))}
      current={range.key}
      build={(k) => href(selected?.websiteId, k)}
    />
  )

  // No sites at all
  if (sites.length === 0) {
    return (
      <div className="space-y-5 w-full px-1 py-3">
        {header()}
        {clientId ? (
          <>
            <Empty title="No sites tracked yet">
              {canManage ? "Add your first site below, then paste its snippet into the site." : "Ask an admin to add this client's websites."}
            </Empty>
            <SitesManager sites={[]} trackerUrl={trackerUrl} canManage={canManage} />
          </>
        ) : (
          <Empty title="No client has tracked sites yet">Choose a client in the switcher, then add its websites.</Empty>
        )}
      </div>
    )
  }

  // Super admin, all clients, nothing picked: one card per site
  if (!selected) {
    const overview = await Promise.all(
      groups.map(async (g) => ({
        ...g,
        stats: await Promise.all(g.sites.map((s) => guarded(getStats(s.websiteId, range), "overview stats"))),
      }))
    )
    return (
      <div className="space-y-5 w-full px-1 py-3">
        {header(rangePills)}
        {overview.map((g) => (
          <section key={g.client.id} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{g.client.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {g.sites.map((s, i) => {
                const st = g.stats[i]
                return (
                  <Link key={s.websiteId} href={href(s.websiteId, range.key)} className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 outline-none">
                    <Card className="h-full transition-colors hover:bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{s.domain}</p>
                      </CardHeader>
                      <CardContent className="flex gap-8">
                        {st ? (
                          <>
                            <div><p className="text-2xl font-bold tabular-nums">{st.visitors.toLocaleString()}</p><p className="text-xs text-muted-foreground">Visitors</p></div>
                            <div><p className="text-2xl font-bold tabular-nums">{st.pageviews.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pageviews</p></div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Couldn&apos;t load stats.</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    )
  }

  const w = { startAt: range.startAt, endAt: range.endAt }
  const [stats, series, pagesR, refsR, countriesR, devicesR, live] = await Promise.all([
    guarded(getStats(selected.websiteId, w), "stats"),
    guarded(getPageviews(selected.websiteId, w, range.unit), "pageviews"),
    guarded(getMetrics(selected.websiteId, w, "path"), "metrics path"),
    guarded(getMetrics(selected.websiteId, w, "referrer"), "metrics referrer"),
    guarded(getMetrics(selected.websiteId, w, "country"), "metrics country"),
    guarded(getMetrics(selected.websiteId, w, "device"), "metrics device"),
    guarded(getActiveVisitors(selected.websiteId), "active"),
  ])

  const chart: TrafficPoint[] = series
    ? series.pageviews.map((p, i) => ({ x: p.x, pageviews: p.y, visitors: series.sessions[i]?.y ?? 0 }))
    : []
  const label = `vs previous ${range.label}`
  const trend = (cur: number, prev: number) => {
    const c = percentChange(cur, prev)
    return c ? { ...c, label } : undefined
  }

  const siteLinks: AnalyticsSite[] = sites
  return (
    <div className="space-y-5 w-full px-1 py-3">
      {header(rangePills)}

      <div className="flex flex-wrap items-center gap-3">
        {!clientId && (
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
            <Link href={href(undefined, range.key)}>← All sites</Link>
          </Button>
        )}
        {siteLinks.length > 1 && (
          <Pills
            items={siteLinks.map((s) => ({ key: s.websiteId, label: s.name }))}
            current={selected.websiteId}
            build={(id) => href(id, range.key)}
          />
        )}
        <p className="text-xs text-muted-foreground">{selected.domain}</p>
      </div>

      {!stats ? (
        <Empty title="Couldn't reach analytics">
          The analytics server didn&apos;t respond. <Link className="underline" href={href(selected.websiteId, range.key)}>Try again</Link> in a moment.
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Visitors" value={stats.visitors} icon={Users} trend={trend(stats.visitors, stats.comparison.visitors)} />
            <StatCard title="Pageviews" value={stats.pageviews} icon={Eye} trend={trend(stats.pageviews, stats.comparison.pageviews)} />
            <StatCard title="Visits" value={stats.visits} icon={MousePointerClick} trend={trend(stats.visits, stats.comparison.visits)} />
            <StatCard title="Bounce rate" value={stats.visits ? `${Math.round((stats.bounces / stats.visits) * 100)}%` : "–"} icon={Activity} />
            <StatCard title="Avg. visit time" value={stats.visits ? duration(stats.totaltime / stats.visits) : "–"} icon={Clock} />
            <StatCard title="Live now" value={live ?? "–"} icon={Users} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traffic</CardTitle>
              <p className="text-xs text-muted-foreground">Last {range.label}</p>
            </CardHeader>
            <CardContent>
              <TrafficChart data={chart} unit={range.unit} timeZone={ANALYTICS_TIMEZONE} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <BreakdownCard title="Top pages" rows={pagesR && rows(pagesR, "Unknown")} />
            <BreakdownCard title="Referrers" rows={refsR && rows(refsR, "Direct / none")} empty="No referrers yet." />
            <BreakdownCard title="Countries" rows={countriesR && rows(countriesR, "Unknown", countryName)} />
            <BreakdownCard title="Devices" rows={devicesR && rows(devicesR, "Unknown", (x) => x.charAt(0).toUpperCase() + x.slice(1))} />
          </div>
        </>
      )}

      {clientId && <SitesManager sites={sites} trackerUrl={trackerUrl} canManage={canManage} />}
    </div>
  )
}
