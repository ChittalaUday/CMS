import { requireRole } from "@/lib/auth/auth-layout"
import { Role } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

export default async function ApiTokensLayout({ children }: { children: React.ReactNode }) {
  // ADMIN only — SUPER_ADMIN manages tokens per-client in the Clients section
  await requireRole([Role.ADMIN])
  return <>{children}</>
}
