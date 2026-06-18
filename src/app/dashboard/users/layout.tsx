import { requireRole } from "@/lib/auth-layout"
import { ADMIN_ROLES } from "@/lib/roles"

export const dynamic = "force-dynamic"

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await requireRole(ADMIN_ROLES)
  return <>{children}</>
}
