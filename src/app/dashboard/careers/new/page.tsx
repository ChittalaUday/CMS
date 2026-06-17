import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Role, CAREERS_ACCESS_ROLES } from "@/lib/roles"
import { JobForm } from "../JobForm"

export const dynamic = "force-dynamic"

export default async function NewCareerPage() {
  const user = await getSession()
  if (!user) redirect("/")
  if (!(CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)) redirect("/dashboard/blogs")

  return (
    <div className="space-y-5 w-full px-1 py-3">
      <div className="pb-5 border-b border-border/60 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Post a Job
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Fill in the details below. You can save as a draft and publish later.
        </p>
      </div>
      <JobForm />
    </div>
  )
}
