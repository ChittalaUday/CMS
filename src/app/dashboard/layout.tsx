import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

function HeaderSkeleton() {
  return <div className="h-6 w-32 bg-muted rounded animate-pulse" />
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  
  if (!user) {
    redirect("/")
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Suspense fallback={<HeaderSkeleton />}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Dashboard</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-medium text-foreground">Overview</span>
              </div>
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}