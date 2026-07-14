import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { revalidatePath } from "next/cache"
import { Button } from "@/components/ui/button"
import { Plus, Briefcase } from "lucide-react"
import { Role, ADMIN_ROLES, CAREERS_ACCESS_ROLES } from "@/lib/auth/roles"
import { JobsToolbar } from "./JobsToolbar"
import { getJobPostings, updateJobStatus, deleteJobPosting } from "./actions"
import { CareersTableClient } from "./CareersTableClient"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function CareersPage({ searchParams }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")
  if (!(CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)) redirect("/dashboard/blogs")

  const params = await searchParams
  const search = params.search ?? ""
  const status = params.status ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  const { jobs, totalCount, totalPages } = await getJobPostings({
    search,
    status,
    page,
    pageSize: 15,
  })

  const canDelete = (ADMIN_ROLES as readonly Role[]).includes(user.role)

  async function handleUpdateStatus(formData: FormData) {
    "use server"
    const id = formData.get("id") as string
    const newStatus = formData.get("newStatus") as "DRAFT" | "PUBLISHED" | "CLOSED"
    if (id && newStatus) {
      await updateJobStatus(id, newStatus)
      revalidatePath("/dashboard/careers")
    }
  }

  async function handleDelete(formData: FormData) {
    "use server"
    const id = formData.get("id") as string
    if (id) {
      await deleteJobPosting(id)
      revalidatePath("/dashboard/careers")
    }
  }

  return (
    <div className="space-y-5 w-full px-1 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Careers
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Manage job postings, custom questionnaires, and review applicant responses.
          </p>
        </div>
        <Button
          asChild
          className="gap-2 shadow-md hover:shadow-lg transition-all font-semibold h-10"
        >
          <Link href="/dashboard/careers/new">
            <Plus className="size-4" />
            Post a Job
          </Link>
        </Button>
      </div>


      {/* Toolbar */}
      <Suspense>
        <JobsToolbar totalCount={totalCount} search={search} statusFilter={status} />
      </Suspense>

      {/* Empty state */}
      {jobs.length === 0 ? (
        <div className="min-h-[360px] rounded-2xl border border-dashed border-border/80 bg-muted/10 flex flex-col justify-center items-center text-center p-8">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-inner">
            <Briefcase className="size-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            {search || status ? "No matching jobs" : "No Job Postings Yet"}
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm mb-6">
            {search || status
              ? "Try adjusting your search or filters."
              : "Create your first job posting to start receiving applications."}
          </p>
          {!search && !status && (
            <Button asChild className="font-semibold shadow-sm">
              <Link href="/dashboard/careers/new">Post Your First Job</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <CareersTableClient
            jobs={jobs as any}
            canDelete={canDelete}
            currentUserId={user.id}
            isAdmin={canDelete}
            handleUpdateStatus={handleUpdateStatus}
            handleDelete={handleDelete}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                  <Link href={`/dashboard/careers?page=${page - 1}&search=${search}&status=${status}`}>
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                  <Link href={`/dashboard/careers?page=${page + 1}&search=${search}&status=${status}`}>
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
