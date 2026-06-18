import { getSession } from "@/lib/session"
import { isDeveloper } from "@/lib/roles"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await getSession()
  if (user && isDeveloper(user.role)) redirect("/dashboard/api-docs")
  return (
    <>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center p-6 border border-border">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Editors</h3>
            <p className="text-3xl font-bold mt-2">Active</p>
          </div>
        </div>
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center p-6 border border-border">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Blogs</h3>
            <p className="text-3xl font-bold mt-2">Drafts</p>
          </div>
        </div>
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center p-6 border border-border">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Settings</h3>
            <p className="text-sm text-muted-foreground mt-2">Manage system settings</p>
          </div>
        </div>
      </div>
      <div className="min-h-[400px] flex-1 rounded-xl bg-muted/50 border border-border p-6 flex flex-col justify-center items-center text-center">
        <h2 className="text-xl font-bold mb-2">Welcome to your CMS Dashboard</h2>
        <p className="text-muted-foreground max-w-md">Use the sidebar navigation to manage editors, check blog configurations, and control system settings.</p>
      </div>
    </>
  )
}

