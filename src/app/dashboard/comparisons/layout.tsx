import { requireRole } from "@/lib/auth/auth-layout"
import { COMPARISONS_ACCESS_ROLES } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

export default async function ComparisonsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(COMPARISONS_ACCESS_ROLES)
  return <>{children}</>
}
