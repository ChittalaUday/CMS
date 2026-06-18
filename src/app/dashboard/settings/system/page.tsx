import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { Role } from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { API_REGISTRY } from "@/lib/utils/api-registry"
import { ShieldCheck, Globe, KeyRound, Zap, Server, Users, FileText, Briefcase } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SystemSettingsPage() {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) redirect("/dashboard/settings/profile")

  const [clientCount, userCount, postCount, jobCount, clientsWithConfig] = await Promise.all([
    prisma.client.count(),
    prisma.user.count({ where: { role: { not: Role.SUPER_ADMIN } } }),
    prisma.post.count({ where: { published: true } }),
    prisma.jobPosting.count({ where: { status: "PUBLISHED" } }),
    prisma.clientSecurityConfig.count(),
  ])

  const DEFAULTS = {
    apiRateLimitRpm: 60,
    apiRateLimitBurst: 10,
    maxApiKeys: 10,
    allowedOrigins: "Client domain only",
    allowedIps: "All IPs",
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">System Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide stats and default security configuration applied to all clients without a custom override.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Clients", value: clientCount, icon: Globe },
          { label: "Users", value: userCount, icon: Users },
          { label: "Published Posts", value: postCount, icon: FileText },
          { label: "Open Jobs", value: jobCount, icon: Briefcase },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Default security config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Default Security Config
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {clientsWithConfig} of {clientCount} clients have custom config
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Applied to clients without a custom override. Configure per-client overrides in the{" "}
            <a href="/dashboard/clients" className="underline underline-offset-2 hover:text-foreground">
              Clients page
            </a>{" "}
            → Security tab.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Rate limiting</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{DEFAULTS.apiRateLimitRpm} req/min</span> sustained ·{" "}
                    <span className="font-mono">{DEFAULTS.apiRateLimitBurst}</span> burst
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Max API keys</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{DEFAULTS.maxApiKeys}</span> active keys per client
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">CORS origins</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{DEFAULTS.allowedOrigins}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Server className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">IP allowlist</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{DEFAULTS.allowedIps}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public API registry */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Public API — Registered Routes & Scopes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            All endpoints gated behind API key authentication. Each key is issued with specific scopes controlling access.
          </p>
        </div>

        {API_REGISTRY.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{category.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{category.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.scopes.map((scope) => (
                <div key={scope.id} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        scope.permission === "read"
                          ? "text-blue-600 border-blue-500/30 bg-blue-500/5"
                          : "text-amber-600 border-amber-500/30 bg-amber-500/5"
                      }
                    >
                      {scope.permission.toUpperCase()}
                    </Badge>
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{scope.id}</code>
                    <span className="text-xs text-muted-foreground">{scope.description}</span>
                  </div>
                  {scope.endpoints.length > 0 && (
                    <div className="ml-1 space-y-1.5 border-l pl-3">
                      {scope.endpoints.map((ep) => (
                        <div key={ep.path + ep.method} className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono px-1.5 py-0 h-5 shrink-0"
                          >
                            {ep.method}
                          </Badge>
                          <code className="text-xs font-mono text-muted-foreground">{ep.path}</code>
                          <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                            — {ep.summary}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
