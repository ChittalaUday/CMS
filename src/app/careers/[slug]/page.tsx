import { notFound } from "next/navigation"
import { Briefcase, MapPin, DollarSign, Calendar, Building2, Clock, AlertTriangle } from "lucide-react"
import { getJobPostingBySlug } from "@/app/dashboard/careers/actions"
import { ApplyForm } from "./ApplyForm"

interface PageProps {
  params: Promise<{ slug: string }>
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
}

export default async function PublicJobPage({ params }: PageProps) {
  const { slug } = await params
  const job = await getJobPostingBySlug(slug)
  if (!job) notFound()

  const isExpired = job.closingDate && new Date(job.closingDate) < new Date()
  
  // Calculate closing soon badge
  let closingBadge = null
  if (job.closingDate) {
    const closingDate = new Date(job.closingDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    closingDate.setHours(0, 0, 0, 0)
    const daysDiff = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    
    if (daysDiff >= 0 && daysDiff <= 5) {
      closingBadge = (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse">
          <AlertTriangle className="size-3 text-red-500" />
          Closing soon (in {daysDiff}d)
        </span>
      )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Job header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Open Position
            </span>
            {closingBadge}
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            {job.title}
          </h1>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="size-4 shrink-0" />
              {job.department || "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="size-4 shrink-0" />
              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            </span>
            {job.requiredExperience && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4 shrink-0" />
                {job.requiredExperience}{job.requiredExperience.toLowerCase().includes("year") || job.requiredExperience.toLowerCase().includes("yr") ? "" : " years"} Experience
              </span>
            )}
            {(job.salaryMin || job.salaryMax) && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="size-4 shrink-0" />
                {job.currency}{" "}
                {job.salaryMin?.toLocaleString()}
                {job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : "+"}
              </span>
            )}
            {job.closingDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4 shrink-0" />
                {isExpired ? "Closed " : "Apply by "}
                {new Date(job.closingDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Job details (always visible) */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold">About the Role</h2>
            <div
              className="article-body"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>

          {job.requirements && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Requirements</h2>
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: job.requirements }}
              />
            </div>
          )}

          <style>{`
            .article-body {
              color: hsl(var(--foreground) / 0.8);
              font-size: 0.875rem;
              line-height: 1.6;
              word-break: break-word;
            }
            .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
              font-weight: 800;
              letter-spacing: -0.025em;
              color: hsl(var(--foreground));
              margin: 1.5rem 0 0.5rem;
              line-height: 1.25;
            }
            .article-body h1 { font-size: 1.75rem; }
            .article-body h2 { font-size: 1.35rem; border-bottom: 1px solid hsl(var(--border) / 0.6); padding-bottom: 0.3rem; }
            .article-body h3 { font-size: 1.15rem; }
            .article-body p { margin: 0.75rem 0; }
            .article-body a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 4px; }
            .article-body strong, .article-body b { font-weight: 700; color: hsl(var(--foreground)); }
            .article-body em, .article-body i { font-style: italic; }
            .article-body ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
            .article-body ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
            .article-body li { margin: 0.25rem 0; }
            .article-body blockquote {
              border-left: 4px solid hsl(var(--primary) / 0.4);
              padding: 0.4rem 0 0.4rem 1rem;
              margin: 1rem 0;
              color: hsl(var(--muted-foreground));
              font-style: italic;
            }
            .article-body code {
              background: hsl(var(--muted));
              padding: 0.1rem 0.3rem;
              border-radius: 0.25rem;
              font-size: 0.85em;
              font-family: ui-monospace, monospace;
            }
          `}</style>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60" />

        {/* Expired notice or Application form */}
        {isExpired ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center">
            <Clock className="size-8 text-destructive/60 mx-auto mb-2" />
            <p className="font-semibold text-destructive">Applications Closed</p>
            <p className="text-sm text-muted-foreground mt-1">
              The application deadline for this position has passed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Apply for this Role</h2>
              <p className="text-sm text-muted-foreground">
                Fill out the form below. Fields marked{" "}
                <span className="text-destructive font-semibold">*</span> are required.
              </p>
            </div>
            <ApplyForm
              jobId={job.id}
              jobTitle={job.title}
              questions={job.questions}
            />
          </div>
        )}
      </div>
    </div>
  )
}
