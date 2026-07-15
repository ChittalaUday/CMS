import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { SettingsNav } from "./SettingsNav"

export const dynamic = "force-dynamic"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect("/")

  return (
    <div className="w-full px-1 py-3 max-w-4xl space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-border/60 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile, preferences, and account.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar nav */}
        <aside className="w-full md:w-48 shrink-0">
          <SettingsNav role={user.role} />
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
