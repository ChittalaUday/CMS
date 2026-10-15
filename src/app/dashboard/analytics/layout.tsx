import { requireRole } from "@/lib/auth/auth-layout"
import { ANALYTICS_ACCESS_ROLES } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(ANALYTICS_ACCESS_ROLES)
  return <>{children}</>
}
