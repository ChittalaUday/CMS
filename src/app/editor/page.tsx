import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Role } from "@/lib/roles"
import { BlogEditor } from "@/components/editor/blog-editor"
import { isAIConfigured } from "@/lib/ai-config"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await getSession()
  if (!user) redirect("/")
  if (user.role === Role.HR) redirect("/dashboard/careers")
  if (!user.onboardingCompleted) redirect("/onboarding")

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <BlogEditor aiConfigured={isAIConfigured()} />
    </div>
  )
}
