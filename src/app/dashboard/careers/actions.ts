"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { getSession } from "@/lib/session"
import { Role } from "@/generated/prisma/enums"
import {
  ADMIN_ROLES,
  CAREERS_ACCESS_ROLES,
  CAREERS_ADMIN_ROLES,
} from "@/lib/roles"

const MAX_DRAFTS = 10

// --- Auth Helpers ---

async function requireCareersAccess() {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized: please log in.")
  if (!(CAREERS_ACCESS_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: you do not have access to the careers section.")
  }
  return user
}

async function requireCareersAdmin() {
  const user = await requireCareersAccess()
  if (!(CAREERS_ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can perform this action.")
  }
  return user
}

async function assertJobOwnership(jobId: string) {
  const user = await requireCareersAccess()
  if ((ADMIN_ROLES as readonly Role[]).includes(user.role)) return user

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: { createdById: true },
  })
  if (!job) throw new Error("Job posting not found.")
  if (job.createdById !== user.id) {
    throw new Error("Unauthorized: you can only manage job postings you created.")
  }
  return user
}

// --- Prisma error helpers ---
type PrismaKnownError = { code: string; meta?: Record<string, unknown>; message: string }
type PrismaValidationError = { name: string; message: string }

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  const e = err as Record<string, unknown>
  return (
    typeof err === "object" && err !== null &&
    "code" in err && typeof e.code === "string" && (e.code as string).startsWith("P")
  )
}

function isPrismaValidationError(err: unknown): err is PrismaValidationError {
  const e = err as Record<string, unknown>
  return typeof err === "object" && err !== null && "name" in err && e.name === "PrismaClientValidationError"
}

function handlePrismaError(err: unknown, context?: string): never {
  const isDev = process.env.NODE_ENV === "development"
  if (isPrismaKnownError(err)) {
    if (isDev) console.error(`[Careers DB Error]${context ? ` ${context}` : ""}`, err.code, err.message)
    switch (err.code) {
      case "P2002": {
        const fields = (err.meta?.target as string[] | undefined) ?? []
        if (fields.includes("slug")) {
          throw new Error("A job posting with this URL slug already exists. Please change the title slightly.")
        }
        throw new Error("A record with these details already exists.")
      }
      case "P2025":
        throw new Error("The requested record was not found.")
      case "P2003":
        throw new Error("This action is blocked because other records depend on it.")
      default:
        throw new Error("A database error occurred. Please try again.")
    }
  }
  if (isPrismaValidationError(err)) {
    if (isDev) console.error(`[Careers DB Validation]${context ? ` ${context}` : ""}`, err.message)
    throw new Error("Invalid data submitted. Please check your input and try again.")
  }
  // Unknown errors: log in dev, surface generic message in production
  if (isDev) {
    console.error(`[Careers Unknown Error]${context ? ` ${context}` : ""}`, err)
    throw err
  }
  throw new Error("An unexpected error occurred. Please try again.")
}

// --- Slug helper ---
function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
}

// --- Types ---

export type QuestionInput = {
  id?: string
  question: string
  type: "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "YES_NO" | "FILE"
  required: boolean
  order: number
  options?: string[]
}

export type JobPostingInput = {
  title: string
  slug?: string
  department: string
  location: string
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY"
  description: string
  descriptionJson?: Prisma.InputJsonValue
  responsibilities?: string
  responsibilitiesJson?: Prisma.InputJsonValue
  requirements?: string
  requirementsJson?: Prisma.InputJsonValue
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: string
  closingDate?: string | null
  questions?: QuestionInput[]
}

// --- Draft limit helper ---

async function assertDraftLimit(userId: string, excludeId?: string) {
  const where: Prisma.JobPostingWhereInput = { status: "DRAFT", createdById: userId }
  if (excludeId) where.id = { not: excludeId }
  const count = await prisma.jobPosting.count({ where })
  if (count >= MAX_DRAFTS) {
    throw new Error(
      `You have reached the maximum of ${MAX_DRAFTS} saved drafts. Please publish or delete an existing draft before creating a new one.`
    )
  }
}

// --- Job Posting CRUD ---

export async function getJobPostings(params: {
  search?: string
  status?: string
  department?: string
  page?: number
  pageSize?: number
}) {
  const user = await requireCareersAccess()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15))
  const skip = (page - 1) * pageSize

  const where: Prisma.JobPostingWhereInput = {}
  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    where.createdById = user.id
  }

  if (params.search?.trim()) {
    where.OR = [
      { title: { contains: params.search.trim(), mode: "insensitive" } },
      { department: { contains: params.search.trim(), mode: "insensitive" } },
      { location: { contains: params.search.trim(), mode: "insensitive" } },
    ]
  }

  if (params.status && ["DRAFT", "PUBLISHED", "CLOSED"].includes(params.status)) {
    where.status = params.status as "DRAFT" | "PUBLISHED" | "CLOSED"
  }

  if (params.department?.trim()) {
    where.department = { contains: params.department.trim(), mode: "insensitive" }
  }

  const [jobs, totalCount] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        draftParent: { select: { id: true, title: true } },
        _count: { select: { applications: true, questions: true, drafts: true } },
      },
    }),
    prisma.jobPosting.count({ where }),
  ])

  return { jobs, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) }
}

export async function getJobPostingById(id: string) {
  const user = await requireCareersAccess()

  const job = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      draftParent: { select: { id: true, title: true, status: true } },
      drafts: { select: { id: true, title: true, status: true, updatedAt: true } },
      questions: { orderBy: { order: "asc" } },
      _count: { select: { applications: true } },
    },
  })

  if (!job) return null

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role) && job.createdById !== user.id) {
    throw new Error("Unauthorized: you can only view your own job postings.")
  }

  return job
}

export async function getJobPostingBySlug(slug: string) {
  return await prisma.jobPosting.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { questions: { orderBy: { order: "asc" } } },
  })
}

function buildQuestionsCreate(questions: QuestionInput[]) {
  return questions.map((q) => ({
    question: q.question,
    type: q.type,
    required: q.required,
    order: q.order,
    options:
      (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && q.options?.length
        ? q.options
        : undefined,
  }))
}

export async function createJobPosting(data: JobPostingInput) {
  const user = await requireCareersAccess()
  await assertDraftLimit(user.id)

  const slug = data.slug?.trim() || toSlug(data.title)

  try {
    const job = await prisma.jobPosting.create({
      data: {
        title: data.title,
        slug,
        department: data.department,
        location: data.location,
        jobType: data.jobType,
        description: data.description,
        descriptionJson: data.descriptionJson ?? undefined,
        responsibilities: data.responsibilities || null,
        responsibilitiesJson: data.responsibilitiesJson ?? undefined,
        requirements: data.requirements || null,
        requirementsJson: data.requirementsJson ?? undefined,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        currency: data.currency || "INR",
        closingDate: data.closingDate ? new Date(data.closingDate) : null,
        createdById: user.id,
        questions: data.questions?.length
          ? { create: buildQuestionsCreate(data.questions) }
          : undefined,
      },
    })
    revalidatePath("/dashboard/careers")
    return job
  } catch (err) {
    handlePrismaError(err, "createJobPosting")
  }
}

export async function updateJobPosting(id: string, data: JobPostingInput) {
  const user = await assertJobOwnership(id)

  const existing = await prisma.jobPosting.findUnique({
    where: { id },
    select: { status: true, draftParentId: true },
  })
  if (existing?.status === "DRAFT" && !existing.draftParentId) {
    await assertDraftLimit(user.id, id)
  }

  const slug = data.slug?.trim() || toSlug(data.title)

  try {
    await prisma.jobQuestion.deleteMany({ where: { jobId: id } })

    const job = await prisma.jobPosting.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        department: data.department,
        location: data.location,
        jobType: data.jobType,
        description: data.description,
        descriptionJson: data.descriptionJson ?? undefined,
        responsibilities: data.responsibilities || null,
        responsibilitiesJson: data.responsibilitiesJson ?? undefined,
        requirements: data.requirements || null,
        requirementsJson: data.requirementsJson ?? undefined,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        currency: data.currency || "INR",
        closingDate: data.closingDate ? new Date(data.closingDate) : null,
        questions: data.questions?.length
          ? { create: buildQuestionsCreate(data.questions) }
          : undefined,
      },
    })
    revalidatePath("/dashboard/careers")
    revalidatePath(`/dashboard/careers/${id}/edit`)
    return job
  } catch (err) {
    if (
      isPrismaKnownError(err) &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("slug")
    ) {
      const owner = await prisma.jobPosting.findUnique({ where: { slug } })
      if (owner && owner.id === id) return await prisma.jobPosting.findUnique({ where: { id } })
    }
    handlePrismaError(err, "updateJobPosting")
  }
}

export async function updateJobStatus(id: string, status: "DRAFT" | "PUBLISHED" | "CLOSED") {
  await assertJobOwnership(id)
  try {
    const job = await prisma.jobPosting.update({ where: { id }, data: { status } })
    revalidatePath("/dashboard/careers")
    return job
  } catch (err) {
    handlePrismaError(err, "updateJobStatus")
  }
}

export async function deleteJobPosting(id: string) {
  await requireCareersAdmin()
  try {
    await prisma.jobPosting.delete({ where: { id } })
    revalidatePath("/dashboard/careers")
  } catch (err) {
    handlePrismaError(err, "deleteJobPosting")
  }
}

// --- Draft system ---

/** Creates a working draft copy of a published job. One draft per published job. */
export async function createDraftOf(publishedJobId: string) {
  const user = await assertJobOwnership(publishedJobId)
  await assertDraftLimit(user.id)

  const existingDraft = await prisma.jobPosting.findFirst({
    where: { draftParentId: publishedJobId, status: "DRAFT" },
    select: { id: true },
  })
  if (existingDraft) return existingDraft

  const source = await prisma.jobPosting.findUnique({
    where: { id: publishedJobId },
    include: { questions: { orderBy: { order: "asc" } } },
  })
  if (!source) throw new Error("Job posting not found.")

  const draftSlug = `${source.slug}-draft-${Date.now()}`

  const draft = await prisma.jobPosting.create({
    data: {
      title: source.title,
      slug: draftSlug,
      department: source.department,
      location: source.location,
      jobType: source.jobType,
      description: source.description,
      descriptionJson: source.descriptionJson ?? undefined,
      responsibilities: source.responsibilities,
      responsibilitiesJson: source.responsibilitiesJson ?? undefined,
      requirements: source.requirements,
      requirementsJson: source.requirementsJson ?? undefined,
      salaryMin: source.salaryMin,
      salaryMax: source.salaryMax,
      currency: source.currency,
      closingDate: source.closingDate,
      status: "DRAFT",
      draftParentId: publishedJobId,
      createdById: user.id,
      questions: source.questions.length
        ? {
            create: source.questions.map((q) => ({
              question: q.question,
              type: q.type,
              required: q.required,
              order: q.order,
              options: q.options ?? undefined,
            })),
          }
        : undefined,
    },
  })

  revalidatePath("/dashboard/careers")
  return draft
}

/** Discards a draft without affecting the published parent. */
export async function discardDraft(draftId: string) {
  const user = await assertJobOwnership(draftId)

  const draft = await prisma.jobPosting.findUnique({
    where: { id: draftId },
    select: { status: true, draftParentId: true, createdById: true },
  })
  if (!draft) throw new Error("Draft not found.")
  if (draft.status !== "DRAFT") throw new Error("Only drafts can be discarded.")
  if (draft.createdById !== user.id && !(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized.")
  }

  await prisma.jobPosting.delete({ where: { id: draftId } })
  revalidatePath("/dashboard/careers")
  return { parentId: draft.draftParentId }
}

/** Publishes a draft. If linked to a parent, merges into the parent. */
export async function publishDraft(draftId: string) {
  await assertJobOwnership(draftId)

  const draft = await prisma.jobPosting.findUnique({
    where: { id: draftId },
    include: { questions: { orderBy: { order: "asc" } } },
  })
  if (!draft) throw new Error("Draft not found.")
  if (draft.status !== "DRAFT") throw new Error("Only drafts can be published this way.")

  if (draft.draftParentId) {
    await prisma.jobQuestion.deleteMany({ where: { jobId: draft.draftParentId } })

    await prisma.jobPosting.update({
      where: { id: draft.draftParentId },
      data: {
        title: draft.title,
        department: draft.department,
        location: draft.location,
        jobType: draft.jobType,
        description: draft.description,
        descriptionJson: draft.descriptionJson ?? undefined,
        responsibilities: draft.responsibilities,
        responsibilitiesJson: draft.responsibilitiesJson ?? undefined,
        requirements: draft.requirements,
        requirementsJson: draft.requirementsJson ?? undefined,
        salaryMin: draft.salaryMin,
        salaryMax: draft.salaryMax,
        currency: draft.currency,
        closingDate: draft.closingDate,
        status: "PUBLISHED",
        questions: draft.questions.length
          ? {
              create: draft.questions.map((q) => ({
                question: q.question,
                type: q.type,
                required: q.required,
                order: q.order,
                options: q.options ?? undefined,
              })),
            }
          : undefined,
      },
    })

    await prisma.jobPosting.delete({ where: { id: draftId } })
    revalidatePath("/dashboard/careers")
    return { id: draft.draftParentId }
  } else {
    await prisma.jobPosting.update({ where: { id: draftId }, data: { status: "PUBLISHED" } })
    revalidatePath("/dashboard/careers")
    return { id: draftId }
  }
}

// --- Applications ---

export async function getApplications(
  jobId: string,
  params: { status?: string; search?: string; page?: number; pageSize?: number }
) {
  const user = await requireCareersAccess()

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: { createdById: true },
  })
  if (!job) throw new Error("Job posting not found.")
  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role) && job.createdById !== user.id) {
    throw new Error("Unauthorized: you can only view applications for your own job postings.")
  }

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20))
  const skip = (page - 1) * pageSize

  const where: Prisma.JobApplicationWhereInput = { jobId }

  if (params.status && ["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].includes(params.status)) {
    where.status = params.status as "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"
  }

  if (params.search?.trim()) {
    where.OR = [
      { applicantName: { contains: params.search.trim(), mode: "insensitive" } },
      { applicantEmail: { contains: params.search.trim(), mode: "insensitive" } },
    ]
  }

  const [applications, totalCount] = await Promise.all([
    prisma.jobApplication.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.jobApplication.count({ where }),
  ])

  return { applications, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) }
}

export async function getApplicationById(id: string) {
  const user = await requireCareersAccess()

  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: { select: { id: true, title: true, createdById: true } },
      answers: { include: { question: true }, orderBy: { question: { order: "asc" } } },
    },
  })

  if (!application) return null

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role) && application.job.createdById !== user.id) {
    throw new Error("Unauthorized.")
  }

  return application
}

export async function updateApplicationStatus(
  id: string,
  status: "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED",
  notes?: string
) {
  const user = await requireCareersAccess()

  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: { job: { select: { createdById: true } } },
  })
  if (!application) throw new Error("Application not found.")

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role) && application.job.createdById !== user.id) {
    throw new Error("Unauthorized.")
  }

  try {
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
    })
    revalidatePath(`/dashboard/careers/${application.jobId}/applications`)
    return updated
  } catch (err) {
    handlePrismaError(err, "updateApplicationStatus")
  }
}

// --- Public: Submit Application ---

export type ApplicationSubmitInput = {
  jobId: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  resumeUrl?: string
  coverLetter?: string
  answers: { questionId: string; answer: string }[]
}

export async function submitApplication(data: ApplicationSubmitInput) {
  const duplicate = await prisma.jobApplication.findFirst({
    where: { jobId: data.jobId, applicantEmail: data.applicantEmail.toLowerCase().trim() },
  })
  if (duplicate) {
    throw new Error("You have already applied for this position. We will be in touch if there is a match.")
  }

  const job = await prisma.jobPosting.findUnique({
    where: { id: data.jobId },
    select: { status: true, closingDate: true },
  })
  if (!job) throw new Error("This job posting no longer exists.")
  if (job.status !== "PUBLISHED") throw new Error("This job posting is no longer accepting applications.")
  if (job.closingDate && new Date(job.closingDate) < new Date()) {
    throw new Error("The application deadline for this position has passed.")
  }

  try {
    return await prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        applicantName: data.applicantName.trim(),
        applicantEmail: data.applicantEmail.toLowerCase().trim(),
        applicantPhone: data.applicantPhone?.trim() || null,
        resumeUrl: data.resumeUrl?.trim() || null,
        coverLetter: data.coverLetter?.trim() || null,
        answers: data.answers.length
          ? { create: data.answers.map((a) => ({ questionId: a.questionId, answer: a.answer })) }
          : undefined,
      },
    })
  } catch (err) {
    handlePrismaError(err, "submitApplication")
  }
}

// --- Dashboard stats ---

export async function getCareersDashboardStats() {
  const user = await requireCareersAccess()

  const where: Prisma.JobPostingWhereInput = (ADMIN_ROLES as readonly Role[]).includes(user.role)
    ? {}
    : { createdById: user.id }

  const [totalJobs, publishedJobs, totalApplications, newApplications] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.count({ where: { ...where, status: "PUBLISHED" } }),
    prisma.jobApplication.count({ where: { job: where } }),
    prisma.jobApplication.count({ where: { job: where, status: "NEW" } }),
  ])

  return { totalJobs, publishedJobs, totalApplications, newApplications }
}
