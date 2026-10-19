import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { Role } from "@/lib/auth/roles"
import { BlogEditor } from "@/components/editor/blog-editor"
import { isAIConfigured } from "@/lib/ai/ai-config"
import { getClientChoices } from "@/lib/utils/client-context"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await getSession()
  if (!user) redirect("/")
  if (user.role === Role.HR) redirect("/dashboard/careers")
  if (!user.onboardingCompleted) redirect("/onboarding")
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
  const { clients, activeClientId } = await getClientChoices()

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <BlogEditor aiConfigured={isAIConfigured()} isAdmin={isAdmin} clients={clients} defaultClientId={activeClientId} />
    </div>
  )
}
