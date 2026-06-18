import { requireRole } from "@/lib/auth-layout"
import { BLOG_ACCESS_ROLES } from "@/lib/roles"

export const dynamic = "force-dynamic"

export default async function MediaLayout({ children }: { children: React.ReactNode }) {
  await requireRole(BLOG_ACCESS_ROLES)
  return <>{children}</>
}
