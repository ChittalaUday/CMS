"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { getSession } from "@/lib/auth/session"
import { uploadToStorage, deleteFromStorage, getImageDimensions } from "@/lib/upload"
import { Role } from "@/generated/prisma/enums"

import {
  ADMIN_ROLES,
  BLOG_ACCESS_ROLES,
} from "@/lib/auth/roles"
import { getClientScope, requireClientScope } from "@/lib/utils/client-context"
import { sanitizeBlogHtml } from "@/lib/utils/sanitize"
import { getClientIdFromRequestHeaders } from "@/lib/auth/api-auth"

// --- Auth Helpers ---
async function requireAuth() {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized")
  return user
}

// HR users are careers-only; block them from all blog operations.
async function requireBlogAccess() {
  const user = await requireAuth()
  if (!(BLOG_ACCESS_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: you do not have access to blog management.")
  }
  return user
}

const isDev = process.env.NODE_ENV === "development"

// --- Duck-type helpers for Prisma errors ---
// Avoids instanceof across module boundaries (broken in Prisma 7 with Turbopack).
type PrismaKnownError = { code: string; meta?: Record<string, unknown>; message: string }
type PrismaValidationError = { name: string; message: string }

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  const e = err as Record<string, unknown>
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof e.code === "string" &&
    e.code.startsWith("P")
  )
}

function isPrismaValidationError(err: unknown): err is PrismaValidationError {
  const e = err as Record<string, unknown>
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    e.name === "PrismaClientValidationError"
  )
}

// --- Centralised DB Error Handler ---
// Maps known Prisma errors to safe, user-facing messages.
// The raw error is logged server-side only — never sent to the client.
function handlePrismaError(err: unknown, context?: string): never {
  if (isPrismaKnownError(err)) {
    if (isDev) console.error(`[DB Error]${context ? ` ${context}` : ""}`, err.code, err.message)

    switch (err.code) {
      case "P2002": {
        const fields = (err.meta?.target as string[] | undefined) ?? []
        if (fields.includes("slug")) {
          throw new Error("A post with this URL slug already exists. Please choose a different slug.")
        }
        if (fields.includes("email")) {
          throw new Error("This email address is already in use.")
        }
        if (fields.includes("name")) {
          throw new Error("This name is already taken. Please choose a different one.")
        }
        throw new Error("A record with these details already exists.")
      }
      case "P2025":
        throw new Error("The requested record was not found.")
      case "P2003":
        throw new Error("This action is blocked because other records depend on it.")
      case "P2014":
        throw new Error("This change would violate a required relationship.")
      default:
        throw new Error("A database error occurred. Please try again.")
    }
  }

  if (isPrismaValidationError(err)) {
    if (isDev) console.error(`[DB Validation]${context ? ` ${context}` : ""}`, err.message)
    throw new Error("Invalid data submitted. Please check your input and try again.")
  }

  // Unknown (non-Prisma) errors — full details in dev, generic message in prod
  if (isDev) { console.error(`[Unexpected Error]${context ? ` ${context}` : ""}`, err); throw err as Error }
  throw new Error("An unexpected error occurred. Please try again.")
}

// --- Posts Actions ---
const REVISION_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  featuredImage: true,
  categories: { include: { category: true } },
  _count: { select: { comments: true, likes: true, views: true } },
} as const

export async function getPosts() {
  const user = await requireBlogAccess()
  const clientId = await getClientScope()
  const where: Prisma.PostWhereInput = {
    draftParentId: null,
    ...(user.role === Role.EDITOR ? { authorId: user.id } : {}),
    ...(clientId ? { clientId } : {}),
  }
  return await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      ...REVISION_INCLUDE,
      drafts: { take: 1, include: REVISION_INCLUDE },
    },
  })
}

export async function getPostsPaginated(options: {
  search?: string
  categoryId?: string
  status?: string
  page?: number
  pageSize?: number
  showEditorDrafts?: boolean
}) {
  const user = await requireBlogAccess()

  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 15))
  const skip = (page - 1) * pageSize

  const clientId = await getClientScope()
  // Exclude draft revisions — they are shown as child rows in the table
  const where: Prisma.PostWhereInput = {
    draftParentId: null,
    ...(clientId ? { clientId } : {}),
  }

  // Editors see only their own posts; admins hide other editors' unreviewed drafts by default
  if (user.role === Role.EDITOR) {
    where.authorId = user.id
  } else if ((ADMIN_ROLES as readonly Role[]).includes(user.role) && !options.showEditorDrafts) {
    // Equivalent to: show (own OR published OR scheduled OR pending-review).
    // Written as NOT to avoid { not: null } inside OR which Prisma 7 rejects at runtime.
    where.NOT = {
      AND: [
        { published: false },
        { scheduledAt: null },
        { reviewRequested: false },
        { authorId: { not: user.id } },
      ],
    }
  }

  if (options.status === "published") {
    where.published = true
    where.scheduledAt = null
  } else if (options.status === "draft") {
    where.published = false
    where.scheduledAt = null
  } else if (options.status === "pending_review") {
    where.published = false
    where.scheduledAt = null
    where.reviewRequested = true
  } else if (options.status === "scheduled") {
    where.published = false
    where.scheduledAt = { not: null }
  } else if (options.status === "revision") {
    where.published = true
    where.drafts = { some: {} }
  }

  if (options.search?.trim()) {
    where.OR = [
      { title: { contains: options.search.trim(), mode: "insensitive" } },
      { slug: { contains: options.search.trim(), mode: "insensitive" } },
    ]
  }

  if (options.categoryId) {
    where.categories = { some: { categoryId: options.categoryId } }
  }

  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        ...REVISION_INCLUDE,
        drafts: { take: 1, include: REVISION_INCLUDE },
      },
    }),
    prisma.post.count({ where }),
  ])

  return {
    posts,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

export async function getPostById(id: string) {
  const user = await requireBlogAccess()
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      featuredImage: true,
      categories: { include: { category: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, email: true } } },
      },
      media: { include: { media: true } },
      // Include parent link and any pending draft revision
      draftParent: { select: { id: true, slug: true, title: true, published: true } },
      drafts: {
        take: 1,
        include: {
          featuredImage: true,
          categories: { include: { category: true } },
        },
      },
    },
  })

  if (!post) return null

  if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }

  if (user.role === Role.EDITOR && post.authorId !== user.id) {
    throw new Error("Unauthorized: you can only view your own posts.")
  }
  return post
}

export async function getPostBySlug(slug: string) {
  const clientId = await getClientIdFromRequestHeaders()
  return await prisma.post.findFirst({
    where: {
      slug,
      ...(clientId ? { clientId } : {}),
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      featuredImage: true,
      categories: { include: { category: true } },
    },
  })
}

export type PostInput = {
  title: string
  slug: string
  content: string
  contentJson?: Prisma.InputJsonValue
  published?: boolean
  featured?: boolean
  featuredImageId?: string | null
  categoryIds?: string[]
  metadata?: Prisma.InputJsonValue
}

export async function createPost(data: PostInput) {
  const user = await requireBlogAccess()
  const clientId = await requireClientScope()
  const safeContent = sanitizeBlogHtml(data.content)

  try {
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: safeContent,
        contentJson: data.contentJson || {},
        published: data.published ?? false,
        featured: data.featured ?? false,
        authorId: user.id,
        featuredImageId: data.featuredImageId || null,
        metadata: data.metadata || {},
        clientId,
        categories: data.categoryIds
          ? {
              create: data.categoryIds.map((id) => ({
                categoryId: id,
              })),
            }
          : undefined,
      },
    })

    revalidatePath("/dashboard/blogs")
    return post
  } catch (err) {
    // If the slug already exists, return the existing post rather than erroring
    if (
      isPrismaKnownError(err) &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("slug")
    ) {
      const existing = await prisma.post.findFirst({ where: { slug: data.slug, clientId } })
      if (existing) return existing
    }
    handlePrismaError(err, "createPost")
  }
}

export async function updatePost(id: string, data: PostInput) {
  const user = await requireBlogAccess()
  const clientId = await getClientScope()
  const safeContent = sanitizeBlogHtml(data.content)

  const existing = await prisma.post.findUnique({
    where: { id, ...(clientId ? { clientId } : {}) },
    select: { authorId: true, draftParentId: true, slug: true },
  })
  if (!existing) throw new Error("Post not found.")

  if (user.role === Role.EDITOR && existing.authorId !== user.id) {
    throw new Error("Unauthorized: you can only edit your own posts.")
  }

  // Draft revisions keep their internal --draft slug; store the proposed published slug in metadata
  const isRevision = existing.draftParentId !== null
  const slugToStore = isRevision ? existing.slug : data.slug
  const metadataToStore = isRevision
    ? { ...(data.metadata as Record<string, unknown>), proposedSlug: data.slug }
    : data.metadata || {}

  try {
    await prisma.postCategory.deleteMany({ where: { postId: id } })

    const post = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        slug: slugToStore,
        content: safeContent,
        contentJson: data.contentJson || {},
        published: isRevision ? false : (data.published ?? false),
        featured: isRevision ? (data.featured ?? false) : (data.featured ?? false),
        featuredImageId: data.featuredImageId || null,
        metadata: metadataToStore,
        categories: data.categoryIds
          ? { create: data.categoryIds.map((catId) => ({ categoryId: catId })) }
          : undefined,
      },
    })

    revalidatePath("/dashboard/blogs")
    revalidatePath(`/dashboard/blogs/${id}/edit`)
    return post
  } catch (err) {
    if (
      isPrismaKnownError(err) &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("slug")
    ) {
      const owner = await prisma.post.findFirst({
        where: { slug: slugToStore, clientId: clientId ?? undefined },
      })
      if (owner && owner.id === id) {
        return await prisma.post.findUnique({ where: { id } })
      }
    }
    handlePrismaError(err, "updatePost")
  }
}

export async function togglePublished(id: string) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can publish posts.")
  }

  try {
    const post = await prisma.post.findUnique({ where: { id }, select: { published: true, clientId: true } })
    if (!post) throw new Error("Post not found")

    if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
      throw new Error("Unauthorized: you do not have access to this post.")
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { published: !post.published },
    })

    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "togglePublished")
  }
}

export async function toggleFeatured(id: string) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can feature posts.")
  }

  try {
    const post = await prisma.post.findUnique({ where: { id }, select: { featured: true, clientId: true } })
    if (!post) throw new Error("Post not found")

    if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
      throw new Error("Unauthorized: you do not have access to this post.")
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { featured: !post.featured },
    })

    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "toggleFeatured")
  }
}

// Creates a draft revision for a published post, or updates the existing one.
// The revision is a shadow copy — the published post is untouched until publishPostDraftRevision is called.
export async function upsertPostDraftRevision(parentId: string, data: PostInput) {
  const user = await requireBlogAccess()
  const safeContent = sanitizeBlogHtml(data.content)

  const parent = await prisma.post.findUnique({
    where: { id: parentId },
    include: { drafts: { take: 1, select: { id: true, slug: true } } },
  })
  if (!parent) throw new Error("Post not found.")
  if (user.role !== Role.SUPER_ADMIN && parent.clientId && parent.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (!parent.published) throw new Error("Draft revisions are only for published posts.")
  if (parent.draftParentId) throw new Error("Cannot create a revision of a revision.")

  if (user.role === Role.EDITOR && parent.authorId !== user.id) {
    throw new Error("Unauthorized: you can only edit your own posts.")
  }

  const existingDraft = parent.drafts[0]

  // Admin-created revisions are immediately visible in the review queue
  const autoReviewRequested = (ADMIN_ROLES as readonly Role[]).includes(user.role)

  try {
    if (existingDraft) {
      await prisma.postCategory.deleteMany({ where: { postId: existingDraft.id } })
      const updated = await prisma.post.update({
        where: { id: existingDraft.id },
        data: {
          title: data.title,
          slug: existingDraft.slug,
          content: safeContent,
          contentJson: data.contentJson || {},
          published: false,
          featured: data.featured ?? false,
          featuredImageId: data.featuredImageId || null,
          metadata: { ...(data.metadata as Record<string, unknown>), proposedSlug: data.slug },
          ...(autoReviewRequested ? { reviewRequested: true } : {}),
          categories: data.categoryIds
            ? { create: data.categoryIds.map((catId) => ({ categoryId: catId })) }
            : undefined,
        },
      })
      revalidatePath("/dashboard/blogs")
      return updated
    }

    // Create revision — slug must be unique; use parentSlug--draft
    let draftSlug = `${parent.slug}--draft`
    let attempt = 1
    while (await prisma.post.findFirst({ where: { slug: draftSlug, clientId: parent.clientId }, select: { id: true } })) {
      draftSlug = `${parent.slug}--draft-${attempt++}`
    }

    const draft = await prisma.post.create({
      data: {
        title: data.title,
        slug: draftSlug,
        content: data.content,
        contentJson: data.contentJson || {},
        published: false,
        featured: data.featured ?? false,
        authorId: parent.authorId,
        featuredImageId: data.featuredImageId || null,
        draftParentId: parentId,
        clientId: parent.clientId ?? undefined,
        reviewRequested: autoReviewRequested,
        metadata: { ...(data.metadata as Record<string, unknown>), proposedSlug: data.slug },
        categories: data.categoryIds
          ? { create: data.categoryIds.map((catId) => ({ categoryId: catId })) }
          : undefined,
      },
    })
    revalidatePath("/dashboard/blogs")
    return draft
  } catch (err) {
    handlePrismaError(err, "upsertPostDraftRevision")
  }
}

// Applies a draft revision to its parent published post, then deletes the revision.
export async function publishPostDraftRevision(draftId: string) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can publish posts.")
  }

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    include: { categories: true },
  })
  if (!draft) throw new Error("Draft revision not found.")
  if (user.role !== Role.SUPER_ADMIN && draft.clientId && draft.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (!draft.draftParentId) throw new Error("This post is not a draft revision.")

  const proposedSlug = ((draft.metadata as Record<string, unknown>)?.proposedSlug as string) || null

  try {
    await prisma.$transaction(async (tx) => {
      await tx.postCategory.deleteMany({ where: { postId: draft.draftParentId! } })

      await tx.post.update({
        where: { id: draft.draftParentId! },
        data: {
          title: draft.title,
          ...(proposedSlug ? { slug: proposedSlug } : {}),
          content: draft.content,
          contentJson: draft.contentJson || {},
          published: true,
          featured: draft.featured,
          featuredImageId: draft.featuredImageId || null,
          metadata: (() => {
            const m = { ...(draft.metadata as Record<string, unknown>) }
            delete m.proposedSlug
            return m
          })() as Prisma.InputJsonValue,
          categories: draft.categories.length > 0
            ? { create: draft.categories.map((c) => ({ categoryId: c.categoryId })) }
            : undefined,
        },
      })

      await tx.post.delete({ where: { id: draftId } })
    })

    revalidatePath("/dashboard/blogs")
    if (proposedSlug) revalidatePath(`/posts/${proposedSlug}`)
    return { parentId: draft.draftParentId }
  } catch (err) {
    handlePrismaError(err, "publishPostDraftRevision")
  }
}

// Fetches both the published parent and its draft revision for the comparison dialog.
export async function getRevisionComparison(draftId: string) {
  const user = await requireBlogAccess()

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    include: {
      categories: { include: { category: true } },
      featuredImage: true,
    },
  })
  if (!draft || !draft.draftParentId) throw new Error("Draft revision not found.")
  if (user.role !== Role.SUPER_ADMIN && draft.clientId && draft.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }

  const parent = await prisma.post.findUnique({
    where: { id: draft.draftParentId },
    include: {
      categories: { include: { category: true } },
      featuredImage: true,
    },
  })
  if (!parent) throw new Error("Parent post not found.")

  return { draft, parent }
}

export async function deletePost(id: string) {
  const user = await requireBlogAccess()
  const clientId = await getClientScope()

  const existing = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, clientId: true },
  })
  if (!existing) throw new Error("Post not found.")

  if (user.role !== Role.SUPER_ADMIN && existing.clientId && existing.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }

  if (user.role === Role.EDITOR && existing.authorId !== user.id) {
    throw new Error("Unauthorized: you can only delete your own posts.")
  }

  try {
    await prisma.post.delete({ where: { id } })
    revalidatePath("/dashboard/blogs")
  } catch (err) {
    handlePrismaError(err, "deletePost")
  }
}

export async function schedulePost(id: string, scheduledAt: Date) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can schedule posts.")
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { published: true, clientId: true, draftParentId: true },
  })
  if (!post) throw new Error("Post not found.")
  if (post.published) throw new Error("Post is already published.")
  if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (scheduledAt <= new Date()) {
    throw new Error("Scheduled date must be in the future.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id },
      data: { scheduledAt },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "schedulePost")
  }
}

export async function unschedulePost(id: string) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can unschedule posts.")
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { clientId: true },
  })
  if (!post) throw new Error("Post not found.")
  if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id },
      data: { scheduledAt: null },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "unschedulePost")
  }
}

// Schedules a draft revision to be applied at a future date.
export async function schedulePostDraftRevision(draftId: string, scheduledAt: Date) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can schedule posts.")
  }

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    select: { clientId: true, draftParentId: true },
  })
  if (!draft) throw new Error("Draft revision not found.")
  if (!draft.draftParentId) throw new Error("This post is not a draft revision.")
  if (user.role !== Role.SUPER_ADMIN && draft.clientId && draft.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (scheduledAt <= new Date()) {
    throw new Error("Scheduled date must be in the future.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id: draftId },
      data: { scheduledAt },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "schedulePostDraftRevision")
  }
}

export async function submitRevisionForReview(draftId: string) {
  const user = await requireBlogAccess()

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    select: { clientId: true, draftParentId: true, authorId: true },
  })
  if (!draft) throw new Error("Draft revision not found.")
  if (!draft.draftParentId) throw new Error("This post is not a draft revision.")

  if (user.role !== Role.SUPER_ADMIN && draft.clientId && draft.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (user.role === Role.EDITOR && draft.authorId !== user.id) {
    throw new Error("Unauthorized: you can only submit your own revisions.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id: draftId },
      data: { reviewRequested: true },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "submitRevisionForReview")
  }
}

export async function withdrawRevisionFromReview(draftId: string) {
  const user = await requireBlogAccess()

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    select: { clientId: true, draftParentId: true, authorId: true },
  })
  if (!draft) throw new Error("Draft revision not found.")
  if (!draft.draftParentId) throw new Error("This post is not a draft revision.")

  if (user.role !== Role.SUPER_ADMIN && draft.clientId && draft.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (user.role === Role.EDITOR && draft.authorId !== user.id) {
    throw new Error("Unauthorized: you can only withdraw your own revisions.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id: draftId },
      data: { reviewRequested: false },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "withdrawRevisionFromReview")
  }
}

export async function unschedulePostDraftRevision(draftId: string) {
  const user = await requireBlogAccess()

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can unschedule posts.")
  }

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    select: { clientId: true, draftParentId: true },
  })
  if (!draft) throw new Error("Draft revision not found.")
  if (!draft.draftParentId) throw new Error("This post is not a draft revision.")
  if (user.role !== Role.SUPER_ADMIN && draft.clientId && draft.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id: draftId },
      data: { scheduledAt: null },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "unschedulePostDraftRevision")
  }
}

export async function submitPostForReview(postId: string) {
  const user = await requireBlogAccess()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { clientId: true, draftParentId: true, authorId: true, published: true },
  })
  if (!post) throw new Error("Post not found.")
  if (post.draftParentId) throw new Error("Use submitRevisionForReview for draft revisions.")
  if (post.published) throw new Error("Published posts cannot be submitted for review.")

  if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (user.role === Role.EDITOR && post.authorId !== user.id) {
    throw new Error("Unauthorized: you can only submit your own posts for review.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { reviewRequested: true },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "submitPostForReview")
  }
}

export async function withdrawPostFromReview(postId: string) {
  const user = await requireBlogAccess()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { clientId: true, draftParentId: true, authorId: true },
  })
  if (!post) throw new Error("Post not found.")
  if (post.draftParentId) throw new Error("Use withdrawRevisionFromReview for draft revisions.")

  if (user.role !== Role.SUPER_ADMIN && post.clientId && post.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this post.")
  }
  if (user.role === Role.EDITOR && post.authorId !== user.id) {
    throw new Error("Unauthorized: you can only withdraw your own posts from review.")
  }

  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { reviewRequested: false },
    })
    revalidatePath("/dashboard/blogs")
    return updated
  } catch (err) {
    handlePrismaError(err, "withdrawPostFromReview")
  }
}

// --- Categories Actions ---
export async function getCategories() {
  await requireBlogAccess()
  const clientId = await getClientScope()
  return await prisma.category.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { name: "asc" },
  })
}

export async function createCategory(name: string) {
  await requireBlogAccess()
  const clientId = await requireClientScope()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
  try {
    const category = await prisma.category.create({
      data: { name, slug, clientId },
    })
    revalidatePath("/dashboard/blogs")
    return category
  } catch (err) {
    handlePrismaError(err, "createCategory")
  }
}

export async function deleteCategory(id: string) {
  const user = await requireBlogAccess()

  const category = await prisma.category.findUnique({
    where: { id },
    select: { clientId: true },
  })
  if (!category) throw new Error("Category not found.")

  if (user.role !== Role.SUPER_ADMIN && category.clientId && category.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this category.")
  }

  // Verify that the category is not used by any posts
  const usageCount = await prisma.postCategory.count({
    where: { categoryId: id },
  })

  if (usageCount > 0) {
    throw new Error("Cannot delete category: It is currently assigned to one or more posts.")
  }

  try {
    await prisma.category.delete({ where: { id } })
    revalidatePath("/dashboard/blogs")
  } catch (err) {
    handlePrismaError(err, "deleteCategory")
  }
}

// --- Media Actions ---
export async function getMediaItems(options?: {
  search?: string
  type?: string
  page?: number
  pageSize?: number
}) {
  await requireBlogAccess()
  const clientId = await getClientScope()

  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 24))
  const skip = (page - 1) * pageSize

  const where: Prisma.MediaWhereInput = clientId ? { clientId } : {}

  if (options?.search?.trim()) {
    const query = options.search.trim()
    where.OR = [
      { filename: { contains: query, mode: "insensitive" } },
      { mimeType: { contains: query, mode: "insensitive" } },
    ]
  }

  if (options?.type && options.type !== "all") {
    if (options.type === "image") {
      where.mimeType = { startsWith: "image/" }
    } else if (options.type === "video") {
      where.mimeType = { startsWith: "video/" }
    } else if (options.type === "audio") {
      where.mimeType = { startsWith: "audio/" }
    } else if (options.type === "document") {
      where.AND = [
        { NOT: { mimeType: { startsWith: "image/" } } },
        { NOT: { mimeType: { startsWith: "video/" } } },
        { NOT: { mimeType: { startsWith: "audio/" } } },
      ]
    }
  }

  const [media, totalCount] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.media.count({ where }),
  ])

  return {
    media,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}

export async function uploadMediaItem(formData: FormData) {
  const user = await requireBlogAccess()
  const file = formData.get("file") as File | null
  if (!file) throw new Error("No file provided")

  try {
    const { shaKey, buffer, url } = await uploadToStorage(file, "uploads")

    const existing = await prisma.media.findUnique({ where: { shaKey } })
    if (existing) return existing

    const dimensions = getImageDimensions(buffer, file.type)
    const clientId = await requireClientScope()

    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        userId: user.id,
        shaKey,
        clientId,
      },
    })

    revalidatePath("/dashboard/media")
    return media
  } catch (err) {
    handlePrismaError(err, "uploadMediaItem")
  }
}

export async function deleteMediaItem(id: string) {
  const user = await requireBlogAccess()
  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) throw new Error("Media item not found")

  if (user.role !== Role.SUPER_ADMIN && media.clientId && media.clientId !== user.clientId) {
    throw new Error("Unauthorized: you do not have access to this media item.")
  }

  const match = media.url.match(/uploads\/.*$/)
  const key = match ? match[0] : media.url.split("/").pop()!

  await deleteFromStorage(key).catch((err: unknown) => {
    console.warn(`Could not delete R2 object at key ${key}:`, err)
  })

  try {
    await prisma.media.delete({ where: { id } })
    revalidatePath("/dashboard/media")
  } catch (err) {
    handlePrismaError(err, "deleteMediaItem")
  }
}

// --- Interactions Actions ---
export async function addComment(postId: string, content: string, guestName?: string) {
  const user = await getSession()
  return await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: user?.id || null,
      authorName: user ? user.name : (guestName || "Anonymous"),
    },
  })
}

export async function toggleLike(postId: string, ipAddress?: string) {
  const user = await getSession()

  // Find if already liked
  const existingLike = await prisma.like.findFirst({
    where: {
      postId,
      OR: [
        user ? { userId: user.id } : { ipAddress: ipAddress || "unknown" },
      ],
    },
  })

  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } })
    return { liked: false }
  } else {
    await prisma.like.create({
      data: {
        postId,
        userId: user?.id || null,
        ipAddress: user ? null : (ipAddress || "unknown"),
      },
    })
    return { liked: true }
  }
}

export async function recordView(postId: string, ipAddress?: string, userAgent?: string) {
  const user = await getSession()
  await prisma.view.create({
    data: {
      postId,
      userId: user?.id || null,
      ipAddress,
      userAgent,
    },
  })
}
