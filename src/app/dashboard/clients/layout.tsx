import { requireRole } from "@/lib/auth/auth-layout"
import { Role } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.SUPER_ADMIN])
  return <>{children}</>
}
