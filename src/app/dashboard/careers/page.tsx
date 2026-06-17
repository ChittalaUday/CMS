import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { revalidatePath } from "next/cache"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Briefcase,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react"
import { Role, ADMIN_ROLES, CAREERS_ACCESS_ROLES } from "@/lib/roles"
import { JobsToolbar } from "./JobsToolbar"
import { getJobPostings, updateJobStatus, deleteJobPosting } from "./actions"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    classes: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    icon: AlertTriangle,
  },
  PUBLISHED: {
    label: "Published",
    classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  CLOSED: {
    label: "Closed",
    classes: "bg-muted/60 text-muted-foreground border-border/60",
    icon: XCircle,
  },
} as const

const JOB_TYPE_SHORT: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
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
          <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
            <div className="bg-card/40 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[35%]">
                      Job
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Details
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      Applications
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      Posted
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {jobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status]
                    const StatusIcon = cfg.icon

                    return (
                      <tr
                        key={job.id}
                        className="group hover:bg-muted/20 transition-colors duration-150"
                      >
                        {/* Title */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="size-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                              <Briefcase className="size-4 text-primary/60" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                                {job.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="size-3 shrink-0" />
                                  {job.department}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.classes}`}
                          >
                            <StatusIcon className="size-3" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Details */}
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3 shrink-0" />
                              {job.location}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {JOB_TYPE_SHORT[job.jobType] ?? job.jobType}
                            </span>
                            {(job.salaryMin || job.salaryMax) && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <DollarSign className="size-3 shrink-0" />
                                {job.currency}{" "}
                                {job.salaryMin?.toLocaleString()}
                                {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Application count */}
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <Link
                            href={`/dashboard/careers/${job.id}/applications`}
                            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Users className="size-3.5" />
                            {job._count.applications} applicant
                            {job._count.applications !== 1 ? "s" : ""}
                          </Link>
                        </td>

                        {/* Posted date */}
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(job.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {job.closingDate && (
                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5">
                              <Calendar className="size-3" />
                              Closes{" "}
                              {new Date(job.closingDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 sm:px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit + primary status action — sm+ */}
                            <div className="hidden sm:contents">
                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg hover:bg-muted"
                                title="Edit posting"
                                asChild
                              >
                                <Link href={`/dashboard/careers/${job.id}/edit`}>
                                  <Edit className="size-3.5 text-muted-foreground" />
                                </Link>
                              </Button>

                              {/* Publish (DRAFT) */}
                              {job.status === "DRAFT" && (
                                <form action={handleUpdateStatus}>
                                  <input type="hidden" name="id" value={job.id} />
                                  <input type="hidden" name="newStatus" value="PUBLISHED" />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="submit"
                                    className="size-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                                    title="Publish"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                  </Button>
                                </form>
                              )}

                              {/* Close (PUBLISHED) */}
                              {job.status === "PUBLISHED" && (
                                <form action={handleUpdateStatus}>
                                  <input type="hidden" name="id" value={job.id} />
                                  <input type="hidden" name="newStatus" value="CLOSED" />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="submit"
                                    className="size-8 rounded-lg hover:bg-muted"
                                    title="Close posting"
                                  >
                                    <XCircle className="size-3.5 text-muted-foreground" />
                                  </Button>
                                </form>
                              )}

                              {/* Revert to Draft (CLOSED) */}
                              {job.status === "CLOSED" && (
                                <form action={handleUpdateStatus}>
                                  <input type="hidden" name="id" value={job.id} />
                                  <input type="hidden" name="newStatus" value="DRAFT" />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="submit"
                                    className="size-8 rounded-lg hover:bg-yellow-500/10 hover:text-yellow-500"
                                    title="Revert to draft"
                                  >
                                    <AlertTriangle className="size-3.5" />
                                  </Button>
                                </form>
                              )}
                            </div>

                            {/* ⋯ dropdown — secondary actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg hover:bg-muted data-[state=open]:opacity-100"
                                >
                                  <MoreHorizontal className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-sm">
                                {/* Edit — mobile only (sm+ sees the icon button) */}
                                <DropdownMenuItem asChild className="sm:hidden">
                                  <Link
                                    href={`/dashboard/careers/${job.id}/edit`}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit className="size-3.5 text-muted-foreground" />
                                    Edit Posting
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/careers/${job.id}/applications`}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Users className="size-3.5 text-muted-foreground" />
                                    View Applications
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/careers/${job.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="size-3.5 text-muted-foreground" />
                                    Preview Public Page
                                  </a>
                                </DropdownMenuItem>
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <form action={handleDelete} className="w-full">
                                        <input type="hidden" name="id" value={job.id} />
                                        <button
                                          type="submit"
                                          className="w-full flex items-center gap-2 text-destructive cursor-pointer"
                                        >
                                          <Trash2 className="size-3.5" />
                                          Delete
                                        </button>
                                      </form>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
