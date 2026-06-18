import { requireRole } from "@/lib/auth/auth-layout"
import { BLOG_ACCESS_ROLES } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

export default async function BlogsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(BLOG_ACCESS_ROLES)
  return <>{children}</>
}
