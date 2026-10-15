import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Plus, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth/session"
import { ADMIN_ROLES, COMPARISONS_ACCESS_ROLES, type Role } from "@/lib/auth/roles"
import { getClientScope } from "@/lib/utils/client-context"
import { listComparisons } from "../_data/comparisons-queries"
import { ComparisonsToolbar } from "./ComparisonsToolbar"
import { ComparisonsTableClient } from "./ComparisonsTableClient"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function ComparisonsPage({ searchParams }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")
  if (!(COMPARISONS_ACCESS_ROLES as readonly Role[]).includes(user.role)) redirect("/dashboard")

  const params = await searchParams
  const search = params.search ?? ""
  const status = params.status ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  const clientId = await getClientScope()
  const { comparisons, totalCount, totalPages } = await listComparisons({
    clientId,
    search,
    status,
    page,
    pageSize: 15,
  })

  const canDelete = (ADMIN_ROLES as readonly Role[]).includes(user.role)
  // Moving swaps neighbours in the client's full list, so it is only offered when that list is
  // fully visible: a client is selected, no filter, and a single page.
  const canReorder = !!clientId && !search && !status && totalPages <= 1
  const hasFilters = !!search || !!status
  const pageHref = (p: number) => {
    const q = new URLSearchParams({ page: String(p) })
    if (search) q.set("search", search)
    if (status) q.set("status", status)
    return `/dashboard/comparisons?${q.toString()}`
  }

  return (
    <div className="space-y-5 w-full px-1 py-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Comparisons</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Side-by-side tables, such as Private Limited vs LLP, that your website pulls in through the API.
          </p>
        </div>
        <Button asChild className="gap-2 shadow-md hover:shadow-lg transition-all font-semibold h-10">
          <Link href="/dashboard/comparisons/new">
            <Plus className="size-4" />
            New comparison
          </Link>
        </Button>
      </div>

      <Suspense>
        <ComparisonsToolbar totalCount={totalCount} search={search} statusFilter={status} />
      </Suspense>

      {comparisons.length === 0 ? (
        <div className="min-h-[360px] rounded-2xl border border-dashed border-border/80 bg-muted/10 flex flex-col justify-center items-center text-center p-8">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-inner">
            <Table2 className="size-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            {hasFilters ? "No matching comparisons" : "No comparisons yet"}
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm mb-6">
            {hasFilters
              ? "Try adjusting your search or filters."
              : "Create your first comparison table to use on your website's SEO pages."}
          </p>
          {!hasFilters && (
            <Button asChild className="font-semibold shadow-sm">
              <Link href="/dashboard/comparisons/new">Create your first comparison</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <ComparisonsTableClient comparisons={comparisons} canDelete={canDelete} canReorder={canReorder} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                  <Link href={pageHref(page - 1)}>Previous</Link>
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                  <Link href={pageHref(page + 1)}>Next</Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
