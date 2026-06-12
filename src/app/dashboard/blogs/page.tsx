import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function BlogsPage() {
  const user = await getSession()
  
  if (!user) {
    redirect("/")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Blogs</h1>
        <p className="text-muted-foreground">
          Publish, edit, and schedule blog posts.
        </p>
      </div>

      <div className="min-h-[400px] flex-1 rounded-xl border border-dashed border-border bg-card p-6 flex flex-col justify-center items-center text-center">
        <h2 className="text-xl font-bold mb-2">Blogs Management Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          This feature is currently under active development. Editors and Admins will soon be able to manage blog posts and categories here.
        </p>
      </div>
    </div>
  )
}
