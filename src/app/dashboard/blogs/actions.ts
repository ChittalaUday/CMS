"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { getSession } from "@/lib/session"
import { uploadToR2, deleteFromR2 } from "@/lib/s3"
import { Role } from "@/generated/prisma/enums"
import { getImageDimensions } from "@/lib/image-metadata"

import {
  ADMIN_ROLES,
  BLOG_ACCESS_ROLES,
} from "@/lib/roles"

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
  // Exclude draft revisions (draftParentId != null) — they appear as children in the table
  const where: Prisma.PostWhereInput = {
    draftParentId: null,
    ...(user.role === Role.EDITOR ? { authorId: user.id } : {}),
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

export async function getPostsPaginated(params: {
  search?: string
  categoryId?: string
  page?: number
  pageSize?: number
}) {
  const user = await requireBlogAccess()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15))
  const skip = (page - 1) * pageSize

  // Exclude draft revisions — they are shown as child rows in the table
  const where: Prisma.PostWhereInput = { draftParentId: null }

  // Editors can only see their own posts
  if (user.role === Role.EDITOR) {
    where.authorId = user.id
  }

  if (params.search?.trim()) {
    where.OR = [
      { title: { contains: params.search.trim(), mode: "insensitive" } },
      { slug: { contains: params.search.trim(), mode: "insensitive" } },
    ]
  }

  if (params.categoryId) {
    where.categories = { some: { categoryId: params.categoryId } }
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
  if (post && user.role === Role.EDITOR && post.authorId !== user.id) {
    throw new Error("Unauthorized: you can only view your own posts.")
  }
  return post
}

export async function getPostBySlug(slug: string) {
  await requireBlogAccess()
  return await prisma.post.findUnique({
    where: { slug },
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
  featuredImageId?: string | null
  categoryIds?: string[]
  metadata?: Prisma.InputJsonValue
}

export async function createPost(data: PostInput) {
  const user = await requireBlogAccess()

  try {
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        contentJson: data.contentJson || {},
        published: data.published ?? false,
        authorId: user.id,
        featuredImageId: data.featuredImageId || null,
        metadata: data.metadata || {},
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
      const existing = await prisma.post.findUnique({ where: { slug: data.slug } })
      if (existing) return existing
    }
    handlePrismaError(err, "createPost")
  }
}

export async function updatePost(id: string, data: PostInput) {
  const user = await requireBlogAccess()

  const existing = await prisma.post.findUnique({
    where: { id },
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
        content: data.content,
        contentJson: data.contentJson || {},
        published: isRevision ? false : (data.published ?? false),
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
      const owner = await prisma.post.findUnique({ where: { slug: slugToStore } })
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
    const post = await prisma.post.findUnique({ where: { id }, select: { published: true } })
    if (!post) throw new Error("Post not found")

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

// Creates a draft revision for a published post, or updates the existing one.
// The revision is a shadow copy — the published post is untouched until publishPostDraftRevision is called.
export async function upsertPostDraftRevision(parentId: string, data: PostInput) {
  const user = await requireBlogAccess()

  const parent = await prisma.post.findUnique({
    where: { id: parentId },
    include: { drafts: { take: 1, select: { id: true, slug: true } } },
  })
  if (!parent) throw new Error("Post not found.")
  if (!parent.published) throw new Error("Draft revisions are only for published posts.")
  if (parent.draftParentId) throw new Error("Cannot create a revision of a revision.")

  if (user.role === Role.EDITOR && parent.authorId !== user.id) {
    throw new Error("Unauthorized: you can only edit your own posts.")
  }

  const existingDraft = parent.drafts[0]

  try {
    if (existingDraft) {
      await prisma.postCategory.deleteMany({ where: { postId: existingDraft.id } })
      const updated = await prisma.post.update({
        where: { id: existingDraft.id },
        data: {
          title: data.title,
          slug: existingDraft.slug,
          content: data.content,
          contentJson: data.contentJson || {},
          published: false,
          featuredImageId: data.featuredImageId || null,
          metadata: { ...(data.metadata as Record<string, unknown>), proposedSlug: data.slug },
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
    while (await prisma.post.findUnique({ where: { slug: draftSlug }, select: { id: true } })) {
      draftSlug = `${parent.slug}--draft-${attempt++}`
    }

    const draft = await prisma.post.create({
      data: {
        title: data.title,
        slug: draftSlug,
        content: data.content,
        contentJson: data.contentJson || {},
        published: false,
        authorId: parent.authorId,
        featuredImageId: data.featuredImageId || null,
        draftParentId: parentId,
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
  await requireBlogAccess()

  const draft = await prisma.post.findUnique({
    where: { id: draftId },
    include: {
      categories: { include: { category: true } },
      featuredImage: true,
    },
  })
  if (!draft || !draft.draftParentId) throw new Error("Draft revision not found.")

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

  if (user.role === Role.EDITOR) {
    const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } })
    if (!existing) throw new Error("Post not found.")
    if (existing.authorId !== user.id) throw new Error("Unauthorized: you can only delete your own posts.")
  }

  try {
    await prisma.post.delete({ where: { id } })
    revalidatePath("/dashboard/blogs")
  } catch (err) {
    handlePrismaError(err, "deletePost")
  }
}

// --- Categories Actions ---
export async function getCategories() {
  await requireBlogAccess()
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  })
}

export async function createCategory(name: string) {
  await requireBlogAccess()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
  try {
    const category = await prisma.category.create({
      data: { name, slug },
    })
    revalidatePath("/dashboard/blogs")
    return category
  } catch (err) {
    handlePrismaError(err, "createCategory")
  }
}

export async function deleteCategory(id: string) {
  await requireBlogAccess()

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
export async function getMediaItems(params?: {
  search?: string
  type?: string
  page?: number
  pageSize?: number
}) {
  await requireBlogAccess()

  const page = Math.max(1, params?.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params?.pageSize ?? 24))
  const skip = (page - 1) * pageSize

  const where: Prisma.MediaWhereInput = {}

  if (params?.search?.trim()) {
    const query = params.search.trim()
    where.OR = [
      { filename: { contains: query, mode: "insensitive" } },
      { mimeType: { contains: query, mode: "insensitive" } },
    ]
  }

  if (params?.type && params.type !== "all") {
    if (params.type === "image") {
      where.mimeType = { startsWith: "image/" }
    } else if (params.type === "video") {
      where.mimeType = { startsWith: "video/" }
    } else if (params.type === "audio") {
      where.mimeType = { startsWith: "audio/" }
    } else if (params.type === "document") {
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

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Compute SHA-256 hash of the file content for deduplication
  const shaKey = crypto.createHash("sha256").update(buffer).digest("hex")

  try {
    // Check if the file already exists in the database
    const existing = await prisma.media.findUnique({
      where: { shaKey },
    })

    if (existing) {
      return existing
    }

    // Clean filename to avoid directory traversal or weird symbols
    const cleanFilename = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `uploads/${cleanFilename}`

    // Upload to R2 and get public URL
    const fileUrl = await uploadToR2(key, buffer, file.type)

    const dimensions = getImageDimensions(buffer, file.type)

    // Save record to DB
    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: fileUrl,
        mimeType: file.type,
        size: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        userId: user.id,
        shaKey,
      },
    })

    revalidatePath("/dashboard/media")
    return media
  } catch (err) {
    handlePrismaError(err, "uploadMediaItem")
  }
}


export async function deleteMediaItem(id: string) {
  await requireBlogAccess()
  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) throw new Error("Media item not found")

  // Extract S3/R2 key from the URL
  const match = media.url.match(/uploads\/.*$/)
  const key = match ? match[0] : media.url.split("/").pop()!

  // Delete from R2
  await deleteFromR2(key).catch((err) => {
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
