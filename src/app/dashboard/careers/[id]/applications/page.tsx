import { getSession } from "@/lib/auth/session"
import { redirect, notFound } from "next/navigation"
import { Role, CAREERS_ACCESS_ROLES } from "@/lib/auth/roles"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Briefcase, MapPin } from "lucide-react"
import { getApplications, getJobPostingById } from "../../actions"
import { ApplicationsWrapper } from "./ApplicationsWrapper"
import { ExportButton } from "../../ExportButton"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

export default async function ApplicationsPage({ params, searchParams }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")
  if (!(CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)) redirect("/dashboard/blogs")

  const { id } = await params
  const sp = await searchParams

  const job = await getJobPostingById(id)
  if (!job) notFound()

  const { applications } = await getApplications(id, {
    status: sp.status,
    search: sp.search,
    page: sp.page ? parseInt(sp.page, 10) : 1,
    pageSize: 50,
  })

  return (
    <div className="space-y-5 w-full px-1 py-3">
      {/* Back + Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 text-xs gap-1.5 text-muted-foreground -ml-1"
        >
          <Link href="/dashboard/careers">
            <ArrowLeft className="size-3.5" />
            Back to Jobs
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {job.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Briefcase className="size-3" />
                {job.department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {job.location}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  job.status === "PUBLISHED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : job.status === "DRAFT"
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                    : "bg-muted/60 text-muted-foreground border-border/60"
                }`}
              >
                {job.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton jobId={id} className="h-9 text-xs" />
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 text-xs gap-1.5 border-border/60"
            >
              <Link href={`/dashboard/careers/${id}/edit`}>Edit Posting</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Applications table (includes stat cards + search) */}
      {applications.length === 0 ? (
        <div className="min-h-[300px] rounded-2xl border border-dashed border-border/80 bg-muted/10 flex flex-col justify-center items-center text-center p-8">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-inner">
            <Users className="size-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Applications Yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            {job.status === "PUBLISHED"
              ? "The job is live — applications will appear here once candidates apply."
              : "Publish the job posting to start receiving applications."}
          </p>
        </div>
      ) : (
        <ApplicationsWrapper applications={applications} job={job} />
      )}
    </div>
  )
}
