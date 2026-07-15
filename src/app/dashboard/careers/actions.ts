"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { getSession } from "@/lib/auth/session"
import { Role, QueueStatus } from "@/generated/prisma/enums"
import { processQueue, generateJobKeywords } from "@/lib/careers/ats-queue"
import { generateText } from "@/lib/ai/ai"
import {
  ADMIN_ROLES,
  CAREERS_ACCESS_ROLES,
  CAREERS_ADMIN_ROLES,
} from "@/lib/auth/roles"
import { getClientScope, requireClientScope } from "@/lib/utils/client-context"
import { getClientIdFromRequestHeaders } from "@/lib/auth/api-auth"
import { sanitizePlainText, checkForSqlInjection } from "@/lib/utils/sanitize"
import { z } from "zod"

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

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: { createdById: true, clientId: true },
  })
  if (!job) throw new Error("Job posting not found.")

  if (user.role !== Role.SUPER_ADMIN && job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this job posting.")
  }

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role) && job.createdById !== user.id) {
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
  requiredExperience?: string | null
  currency?: string
  closingDate?: string | null
  questions?: QuestionInput[]
  keywords?: string[]
}

// --- Validation schemas ---

const questionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Question text is required"),
  type: z.enum(["SHORT_TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO", "FILE"]),
  required: z.boolean(),
  order: z.number().int().min(0),
  options: z.array(z.string()).optional(),
})

const jobPostingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().max(200).optional(),
  department: z.string().max(100).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  jobType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"]),
  description: z.string().optional().or(z.literal("")),
  descriptionJson: z.unknown().optional(),
  responsibilities: z.string().optional(),
  responsibilitiesJson: z.unknown().optional(),
  requirements: z.string().optional(),
  requirementsJson: z.unknown().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  requiredExperience: z.string().nullable().optional(),
  currency: z.string().max(10).optional(),
  closingDate: z.string().nullable().optional(),
  questions: z.array(questionSchema).optional(),
  keywords: z.array(z.string()).optional(),
})

const applicationSubmitSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  applicantName: z.string().min(1, "Name is required").max(200),
  applicantEmail: z.email("Invalid email address"),
  applicantPhone: z.string().max(30).optional(),
  resumeUrl: z.url().optional().or(z.literal("")).transform(v => v || undefined),
  coverLetter: z.string().max(10000).optional(),
  answers: z.array(z.object({ questionId: z.string().min(1), answer: z.string() })),
})

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

  const clientId = await getClientScope()
  const where: Prisma.JobPostingWhereInput = {
    ...(clientId ? { clientId } : {}),
  }
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

  if (user.role !== Role.SUPER_ADMIN && job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this job posting.")
  }

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role) && job.createdById !== user.id) {
    throw new Error("Unauthorized: you can only view your own job postings.")
  }

  return job
}

export async function getJobPostingBySlug(slug: string) {
  const user = await getSession().catch(() => null)

  if (user && user.role === Role.SUPER_ADMIN) {
    // Super admin can see any job status of any client
    return await prisma.jobPosting.findFirst({
      where: { slug },
      include: { questions: { orderBy: { order: "asc" } } },
    })
  }

  if (user && user.clientId) {
    // Client admins can preview their own client's jobs regardless of status.
    // Non-admins (HR) may only preview published jobs, or drafts they created themselves.
    const isClientAdmin = (ADMIN_ROLES as readonly Role[]).includes(user.role)
    return await prisma.jobPosting.findFirst({
      where: {
        slug,
        clientId: user.clientId,
        ...(isClientAdmin ? {} : { OR: [{ status: "PUBLISHED" }, { createdById: user.id }] }),
      },
      include: { questions: { orderBy: { order: "asc" } } },
    })
  }

  const apiClientId = await getClientIdFromRequestHeaders().catch(() => null)
  return await prisma.jobPosting.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      ...(apiClientId ? { clientId: apiClientId } : {}),
    },
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
  jobPostingSchema.parse(data)
  const user = await requireCareersAccess()
  await assertDraftLimit(user.id)
  const clientId = await requireClientScope()

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
        requiredExperience: data.requiredExperience ?? null,
        currency: data.currency || "INR",
        closingDate: data.closingDate ? new Date(data.closingDate) : null,
        createdById: user.id,
        clientId,
        questions: data.questions?.length
          ? { create: buildQuestionsCreate(data.questions) }
          : undefined,
        keywords: data.keywords ?? [],
        keywordStatus: data.keywords && data.keywords.length > 0 ? QueueStatus.COMPLETED : QueueStatus.IDLE,

      },
    })
    if (!data.keywords || data.keywords.length === 0) {
      generateJobKeywords(job.id)
    }
    revalidatePath("/dashboard/careers")
    return job
  } catch (err) {
    handlePrismaError(err, "createJobPosting")
  }
}

export async function updateJobPosting(id: string, data: JobPostingInput) {
  jobPostingSchema.parse(data)
  const user = await assertJobOwnership(id)

  const existing = await prisma.jobPosting.findUnique({
    where: { id },
    select: { status: true, draftParentId: true, keywords: true, clientId: true },
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
        requiredExperience: data.requiredExperience ?? null,
        currency: data.currency || "INR",
        closingDate: data.closingDate ? new Date(data.closingDate) : null,
        questions: data.questions?.length
          ? { create: buildQuestionsCreate(data.questions) }
          : undefined,
        keywords: data.keywords ?? undefined,
        ...(data.keywords ? { keywordStatus: QueueStatus.COMPLETED } : {}),

      },
    })
    if (!data.keywords && (!existing?.keywords || existing.keywords.length === 0)) {
      generateJobKeywords(job.id)
    }
    revalidatePath("/dashboard/careers")
    revalidatePath(`/dashboard/careers/${id}/edit`)
    return job
  } catch (err) {
    if (
      isPrismaKnownError(err) &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("slug")
    ) {
      const owner = await prisma.jobPosting.findFirst({
        where: { slug, clientId: existing?.clientId },
      })
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
  const user = await requireCareersAdmin()
  const job = await prisma.jobPosting.findUnique({
    where: { id },
    select: { clientId: true },
  })
  if (!job) throw new Error("Job posting not found.")

  if (user.role !== Role.SUPER_ADMIN && job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this job posting.")
  }

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
      requiredExperience: source.requiredExperience,
      currency: source.currency,
      closingDate: source.closingDate,
      status: "DRAFT",
      draftParentId: publishedJobId,
      createdById: user.id,
      clientId: source.clientId,
      keywords: source.keywords,
      keywordStatus: source.keywordStatus,

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
        requiredExperience: draft.requiredExperience,
        currency: draft.currency,
        closingDate: draft.closingDate,
        status: "PUBLISHED",
        keywords: draft.keywords,
        keywordStatus: draft.keywordStatus,

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
    await prisma.jobPosting.update({ 
      where: { id: draftId }, 
      data: { 
        status: "PUBLISHED",
        keywords: draft.keywords,
        keywordStatus: draft.keywordStatus
      } 
    })
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
    select: { createdById: true, clientId: true },
  })
  if (!job) throw new Error("Job posting not found.")

  if (user.role !== Role.SUPER_ADMIN && job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this job posting.")
  }

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
    prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    }),
    prisma.jobApplication.count({ where }),
  ])

  return { applications, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) }
}

export async function getApplicationById(id: string) {
  const user = await requireCareersAccess()

  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: { select: { id: true, title: true, createdById: true, clientId: true } },
      answers: { include: { question: true }, orderBy: { question: { order: "asc" } } },
    },
  })

  if (!application) return null

  if (user.role !== Role.SUPER_ADMIN && application.job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this application.")
  }

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
    include: { job: { select: { createdById: true, clientId: true } } },
  })
  if (!application) throw new Error("Application not found.")

  if (user.role !== Role.SUPER_ADMIN && application.job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this application.")
  }

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
  applicationSubmitSchema.parse(data)

  // SQL Injection validation
  checkForSqlInjection(data.applicantName)
  checkForSqlInjection(data.applicantEmail)
  checkForSqlInjection(data.applicantPhone || "")
  checkForSqlInjection(data.coverLetter || "")
  if (data.answers) {
    for (const ans of data.answers) {
      checkForSqlInjection(ans.answer)
    }
  }

  const duplicate = await prisma.jobApplication.findFirst({
    where: { jobId: data.jobId, applicantEmail: data.applicantEmail.toLowerCase().trim() },
  })
  if (duplicate) {
    throw new Error("You have already applied for this position. We will be in touch if there is a match.")
  }

  const job = await prisma.jobPosting.findUnique({
    where: { id: data.jobId },
    include: { questions: true },
  })
  if (!job) throw new Error("This job posting no longer exists.")
  if (job.status !== "PUBLISHED") throw new Error("This job posting is no longer accepting applications.")
  if (job.closingDate && new Date(job.closingDate) < new Date()) {
    throw new Error("The application deadline for this position has passed.")
  }

  // Validate required questions
  const requiredQuestions = job.questions.filter((q) => q.required)
  for (const reqQ of requiredQuestions) {
    const submittedAnswer = data.answers.find((a) => a.questionId === reqQ.id)
    if (!submittedAnswer || !submittedAnswer.answer.trim()) {
      throw new Error(`The question "${reqQ.question}" is required and must be filled.`)
    }
  }

  try {
    const app = await prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        applicantName: sanitizePlainText(data.applicantName.trim()),
        applicantEmail: data.applicantEmail.toLowerCase().trim(),
        applicantPhone: data.applicantPhone?.trim() || null,
        resumeUrl: data.resumeUrl?.trim() || null,
        coverLetter: data.coverLetter ? sanitizePlainText(data.coverLetter.trim()) || null : null,
        answers: data.answers.length
          ? { create: data.answers.map((a) => ({ questionId: a.questionId, answer: sanitizePlainText(a.answer) })) }
          : undefined,
      },
    })
    
    // Asynchronously trigger Ollama ATS queue processing without blocking submission response
    processQueue().catch((err) => console.error("Error in background ATS queue worker:", err))

    return app
  } catch (err) {
    handlePrismaError(err, "submitApplication")
  }
}

// --- Dashboard stats ---

export async function getCareersDashboardStats() {
  const user = await requireCareersAccess()
  const clientId = await getClientScope()

  const where: Prisma.JobPostingWhereInput = {
    ...(clientId ? { clientId } : {}),
    ...((ADMIN_ROLES as readonly Role[]).includes(user.role) ? {} : { createdById: user.id }),
  }

  const [totalJobs, publishedJobs, totalApplications, newApplications] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.count({ where: { ...where, status: "PUBLISHED" } }),
    prisma.jobApplication.count({ where: { job: where } }),
    prisma.jobApplication.count({ where: { job: where, status: "NEW" } }),
  ])

  return { totalJobs, publishedJobs, totalApplications, newApplications }
}

export async function getAtsScore(applicationId: string, model?: string) {
  const user = await requireCareersAccess()

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { job: { select: { clientId: true } } },
  })
  if (!application) throw new Error("Application not found.")

  if (user.role !== Role.SUPER_ADMIN && application.job.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this application.")
  }

  // Reset to PENDING so the queue worker picks it up
  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: {
      atsStatus: QueueStatus.PENDING,
      atsScore: null,
      atsConfidence: null,
      atsJustification: null,
    },
  })

  // Enqueue into the background worker (non-blocking — survives browser disconnect)
  const { enqueueAtsScorer } = await import("@/lib/careers/ats-queue")
  enqueueAtsScorer(applicationId, model)

  const { queueEvents } = await import("@/lib/careers/queue-events")
  queueEvents.emit("change")
}

export async function getQueueStatus() {
  await requireCareersAccess()
  const { atsQueue, keywordQueue } = await import("@/lib/careers/queue-manager")

  // 1. ATS Queue Stats
  const [atsPending, atsProcessing, atsCompleted, atsFailed, atsItems] = await Promise.all([
    prisma.jobApplication.count({ where: { atsStatus: QueueStatus.PENDING } }),
    prisma.jobApplication.count({ where: { atsStatus: QueueStatus.PROCESSING } }),
    prisma.jobApplication.count({ where: { atsStatus: QueueStatus.COMPLETED } }),
    prisma.jobApplication.count({ where: { atsStatus: QueueStatus.FAILED } }),
    prisma.jobApplication.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        applicantName: true,
        applicantEmail: true,
        atsStatus: true,
        atsScore: true,
        atsJustification: true,
        updatedAt: true,
        job: {
          select: {
            title: true,
          },
        },
      },
    })
  ])

  // 2. Keyword Gen Queue Stats
  const [kwPending, kwProcessing, kwCompleted, kwFailed, kwItems] = await Promise.all([
    prisma.jobPosting.count({ where: { keywordStatus: QueueStatus.PENDING } }),
    prisma.jobPosting.count({ where: { keywordStatus: QueueStatus.PROCESSING } }),
    prisma.jobPosting.count({ where: { keywordStatus: QueueStatus.COMPLETED } }),
    prisma.jobPosting.count({ where: { keywordStatus: QueueStatus.FAILED } }),
    prisma.jobPosting.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        keywordStatus: true,
        keywords: true,
        updatedAt: true
      }
    })
  ])

  return {
    ats: {
      pending: atsPending,
      processing: atsProcessing,
      completed: atsCompleted,
      failed: atsFailed,
      items: atsItems,
      memorySize: atsQueue.size,
      memoryPending: atsQueue.pending
    },
    keyword: {
      pending: kwPending,
      processing: kwProcessing,
      completed: kwCompleted,
      failed: kwFailed,
      items: kwItems,
      memorySize: keywordQueue.size,
      memoryPending: keywordQueue.pending
    }
  }
}

export async function triggerQueueWorker() {
  await requireCareersAccess()
  const { initializeQueues } = await import("@/lib/careers/ats-queue")
  await initializeQueues()
  const { queueEvents } = await import("@/lib/careers/queue-events")
  queueEvents.emit("change")
  return { success: true }
}

export async function resetFailedQueueItems() {
  await requireCareersAccess()
  
  // 1. Reset failed application scans
  const failedApps = await prisma.jobApplication.findMany({
    where: { atsStatus: QueueStatus.FAILED },
    select: { id: true }
  })
  
  await prisma.jobApplication.updateMany({
    where: { atsStatus: QueueStatus.FAILED },
    data: { atsStatus: QueueStatus.PENDING, atsScore: null, atsJustification: null },
  })

  // 2. Reset failed keyword gens
  const failedJobs = await prisma.jobPosting.findMany({
    where: { keywordStatus: QueueStatus.FAILED },
    select: { id: true }
  })

  await prisma.jobPosting.updateMany({
    where: { keywordStatus: QueueStatus.FAILED },
    data: { keywordStatus: QueueStatus.PENDING },
  })

  // Re-enqueue to active queues
  const { enqueueAtsScorer, enqueueKeywordGeneration } = await import("@/lib/careers/ats-queue")
  
  for (const app of failedApps) {
    enqueueAtsScorer(app.id)
  }

  for (const job of failedJobs) {
    enqueueKeywordGeneration(job.id)
  }

  const { queueEvents } = await import("@/lib/careers/queue-events")
  queueEvents.emit("change")

  return { success: true }
}

export async function extractKeywordsFromText(data: {
  title: string
  department: string
  description: string
  requirements?: string
  responsibilities?: string
  questions: string[]
}) {
  await requireCareersAccess()

  const prompt = `You are an expert recruiter and technical analyst.
Extract a list of 10 to 15 key technical skills, tools, frameworks, programming languages, and competencies required for this job posting.
Combine details from the job title, description, requirements, responsibilities, and screening questions.

Job Title: ${data.title}
Department: ${data.department}
Description: ${data.description.replace(/<[^>]*>/g, "")}
Requirements: ${(data.requirements || "").replace(/<[^>]*>/g, "")}
Responsibilities: ${(data.responsibilities || "").replace(/<[^>]*>/g, "")}
Questions: ${data.questions.join(", ")}

Respond with ONLY a comma-separated list of the extracted keywords (e.g. "React, Node.js, TypeScript, PostgreSQL, Docker, AWS"). Do not include any introductory or concluding text. Keep keywords simple.
`.trim()

  const text = await generateText({ prompt })
  const keywords = text
    .split(",")
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 0 && k.length < 30) // Sanity check

  return keywords
}

export async function updateJobKeywords(jobId: string, keywords: string[]) {
  await assertJobOwnership(jobId)
  
  const updated = await prisma.jobPosting.update({
    where: { id: jobId },
    data: {
      keywords,
      keywordStatus: QueueStatus.COMPLETED
    }
  })
  
  revalidatePath("/dashboard/careers")
  revalidatePath("/dashboard/careers/queue")
  
  return updated
}

export async function getExportData(filters: {
  startDate?: string
  endDate?: string
  status?: string
  search?: string
}) {
  const user = await requireCareersAccess()

  const where: Prisma.JobPostingWhereInput = {
    status: { in: ["PUBLISHED", "CLOSED"] },
  }
  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    where.createdById = user.id
  }

  const jobs = await prisma.jobPosting.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
      applications: {
        where: {
          AND: [
            filters.startDate ? { createdAt: { gte: new Date(filters.startDate) } } : {},
            filters.endDate ? { createdAt: { lte: new Date(filters.endDate + "T23:59:59.999Z") } } : {},
            filters.status && filters.status !== "ALL" ? { status: filters.status as "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED" } : {},
            filters.search?.trim() ? {
              OR: [
                { applicantName: { contains: filters.search.trim(), mode: "insensitive" } },
                { applicantEmail: { contains: filters.search.trim(), mode: "insensitive" } },
              ],
            } : {},
          ],
        },
        orderBy: { createdAt: "desc" },
        include: {
          answers: {
            include: {
              question: true,
            },
          },
        },
      },
    },
  })

  return jobs
}

export async function uploadPublicFile(formData: FormData) {
  const { headers } = await import("next/headers")
  const reqHeaders = await headers()
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0].trim() ?? reqHeaders.get("x-real-ip") ?? "unknown"

  const { checkIpRateLimit } = await import("@/lib/utils/rate-limit")
  const rl = checkIpRateLimit(`upload-public-file:${ip}`)
  if (!rl.allowed) throw new Error("Too many uploads. Please try again in a moment.")

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const { uploadViaR2 } = await import("@/lib/upload")
  const res = await uploadViaR2(file)
  return { url: res.url, name: file.name, size: file.size }
}

export async function getCareerDepartments() {
  const clientId = await getClientScope()
  const where: Prisma.CareerDepartmentWhereInput = clientId ? { clientId } : {}
  return prisma.careerDepartment.findMany({
    where,
    orderBy: { name: "asc" },
  })
}

export async function getCareerLocations() {
  const clientId = await getClientScope()
  const where: Prisma.CareerLocationWhereInput = clientId ? { clientId } : {}
  return prisma.careerLocation.findMany({
    where,
    orderBy: { name: "asc" },
  })
}

export async function createCareerDepartment(name: string) {
  await requireCareersAccess()
  const clientId = await getClientScope()
  
  try {
    const newDept = await prisma.careerDepartment.create({
      data: {
        name: name.trim(),
        clientId,
      },
    })
    return newDept
  } catch (err) {
    return handlePrismaError(err, "createCareerDepartment")
  }
}

export async function createCareerLocation(name: string) {
  await requireCareersAccess()
  const clientId = await getClientScope()
  
  try {
    const newLoc = await prisma.careerLocation.create({
      data: {
        name: name.trim(),
        clientId,
      },
    })
    return newLoc
  } catch (err) {
    return handlePrismaError(err, "createCareerLocation")
  }
}


