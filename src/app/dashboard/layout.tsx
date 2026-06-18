import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db/prisma"
import { Building2 } from "lucide-react"

import { DashboardBreadcrumbs } from "@/components/DashboardBreadcrumbs"

function HeaderSkeleton() {
  return <div className="h-6 w-32 bg-muted rounded animate-pulse" />
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  if (!user) {
    redirect("/")
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding")
  }

  // Resolve active client context
  let allClients: { id: string; name: string; slug: string }[] = []
  let activeClientId: string | null = null
  let activeClientName: string | null = null

  if (user.role === "SUPER_ADMIN") {
    const jar = await cookies()
    activeClientId = jar.get("cms_active_client")?.value ?? null

    allClients = await prisma.client.findMany({
      select: { id: true, name: true, slug: true },
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    })

    if (activeClientId) {
      activeClientName = allClients.find((c) => c.id === activeClientId)?.name ?? null
    }
  } else if (user.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      select: { id: true, name: true, slug: true },
    })
    activeClientId = client?.id ?? null
    activeClientName = client?.name ?? null
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        clients={allClients}
        activeClientId={activeClientId}
        activeClientName={activeClientName}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Suspense fallback={<HeaderSkeleton />}>
              <DashboardBreadcrumbs />
            </Suspense>
          </div>
        </header>

        {/* Viewing-as banner for SUPER_ADMIN */}
        {user.role === "SUPER_ADMIN" && activeClientName && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
            <Building2 className="h-3 w-3 shrink-0" />
            <span>Viewing as <strong>{activeClientName}</strong> — data is scoped to this client</span>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
