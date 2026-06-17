import { notFound } from "next/navigation"
import { Briefcase, MapPin, DollarSign, Calendar, Building2, Clock } from "lucide-react"
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
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            {job.title}
          </h1>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="size-4 shrink-0" />
              {job.questions.length > 0 ? job.title : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="size-4 shrink-0" />
              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            </span>
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

        {/* Expired notice */}
        {isExpired ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center">
            <Clock className="size-8 text-destructive/60 mx-auto mb-2" />
            <p className="font-semibold text-destructive">Applications Closed</p>
            <p className="text-sm text-muted-foreground mt-1">
              The application deadline for this position has passed.
            </p>
          </div>
        ) : (
          <>
            {/* Job description */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-bold">About the Role</h2>
                <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </div>

              {job.requirements && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold">Requirements</h2>
                  <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">
                    {job.requirements}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/60" />

            {/* Application form */}
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
          </>
        )}
      </div>
    </div>
  )
}
