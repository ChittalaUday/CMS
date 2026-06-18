import { requireRole } from "@/lib/auth/auth-layout"
import { CAREERS_ACCESS_ROLES } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

export default async function CareersLayout({ children }: { children: React.ReactNode }) {
  await requireRole(CAREERS_ACCESS_ROLES)
  return <>{children}</>
}
