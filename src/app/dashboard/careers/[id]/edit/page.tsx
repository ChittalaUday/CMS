import { getSession } from "@/lib/auth/session"
import { redirect, notFound } from "next/navigation"
import { Role, CAREERS_ACCESS_ROLES } from "@/lib/auth/roles"
import { JobForm, type ExistingJob } from "../../JobForm"
import { getJobPostingById } from "../../actions"

export const dynamic = "force-dynamic"

interface EditCareerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCareerPage({ params }: EditCareerPageProps) {
  const user = await getSession()
  if (!user) redirect("/")
  if (!(CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)) redirect("/dashboard/blogs")

  const { id } = await params
  const job = await getJobPostingById(id)
  if (!job) notFound()

  const existingJob: ExistingJob = {
    id: job.id,
    title: job.title,
    slug: job.slug,
    department: job.department,
    location: job.location,
    jobType: job.jobType as ExistingJob["jobType"],
    description: job.description,
    descriptionJson: job.descriptionJson,
    responsibilities: job.responsibilities,
    responsibilitiesJson: job.responsibilitiesJson,
    requirements: job.requirements,
    requirementsJson: job.requirementsJson,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    requiredExperience: job.requiredExperience,
    currency: job.currency,
    closingDate: job.closingDate,
    status: job.status as ExistingJob["status"],
    draftParentId: job.draftParentId,
    draftParent: job.draftParent
      ? { id: job.draftParent.id, title: job.draftParent.title, status: job.draftParent.status }
      : null,
    questions: job.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type as ExistingJob["questions"][number]["type"],
      required: q.required,
      order: q.order,
      options: q.options,
    })),
    keywords: job.keywords,
  }

  const isDraft = job.status === "DRAFT"
  const pageTitle = isDraft && job.draftParentId ? "Edit Draft" : "Edit Job Posting"
  const pageDesc = isDraft && job.draftParentId
    ? "Editing a working draft. The published version stays live until you publish this draft."
    : "Update the job details. Changes are only visible to applicants after publishing."

  return (
    <div className="space-y-5 w-full px-1 py-3">
      <div className="pb-5 border-b border-border/60 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{pageTitle}</h1>
        <p className="text-muted-foreground text-sm max-w-xl">{pageDesc}</p>
      </div>
      <JobForm job={existingJob} />
    </div>
  )
}
