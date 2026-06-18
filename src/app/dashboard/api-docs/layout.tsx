import { requireAuth } from "@/lib/auth-layout"

export const dynamic = "force-dynamic"

export default async function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()
  return <>{children}</>
}
