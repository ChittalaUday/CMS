"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { getSession } from "@/lib/session"
import { uploadToR2, deleteFromR2 } from "@/lib/s3"

// --- Auth Helpers ---
async function requireAuth() {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized")
  return user
}

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
    console.error(`[DB Error]${context ? ` ${context}` : ""}`, err.code, err.message)

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
    console.error(`[DB Validation]${context ? ` ${context}` : ""}`, err.message)
    throw new Error("Invalid data submitted. Please check your input and try again.")
  }

  // Re-throw non-Prisma errors (e.g. our own "Unauthorized") as-is
  throw err
}

// --- Posts Actions ---
export async function getPosts() {
  await requireAuth()
  return await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
      featuredImage: true,
      categories: { include: { category: true } },
      _count: { select: { comments: true, likes: true, views: true } },
    },
  })
}

export async function getPostsPaginated(params: {
  search?: string
  categoryId?: string
  page?: number
  pageSize?: number
}) {
  await requireAuth()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15))
  const skip = (page - 1) * pageSize

  const where: Prisma.PostWhereInput = {}

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
        author: { select: { id: true, name: true, email: true } },
        featuredImage: true,
        categories: { include: { category: true } },
        _count: { select: { comments: true, likes: true, views: true } },
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
  await requireAuth()
  return await prisma.post.findUnique({
    where: { id },
    include: {
      featuredImage: true,
      categories: { include: { category: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, email: true } } },
      },
      media: { include: { media: true } },
    },
  })
}

export async function getPostBySlug(slug: string) {
  await requireAuth()
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
  const user = await requireAuth()

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
  await requireAuth()

  try {
    // Clear existing category joins
    await prisma.postCategory.deleteMany({
      where: { postId: id },
    })

    const post = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        contentJson: data.contentJson || {},
        published: data.published ?? false,
        featuredImageId: data.featuredImageId || null,
        metadata: data.metadata || {},
        categories: data.categoryIds
          ? {
              create: data.categoryIds.map((catId) => ({
                categoryId: catId,
              })),
            }
          : undefined,
      },
    })

    revalidatePath("/dashboard/blogs")
    revalidatePath(`/dashboard/blogs/${id}/edit`)
    return post
  } catch (err) {
    // P2002 on slug: if the conflicting slug belongs to THIS post, it's a no-op
    // (happens during auto-save when the slug hasn't changed)
    if (
      isPrismaKnownError(err) &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("slug")
    ) {
      const owner = await prisma.post.findUnique({ where: { slug: data.slug } })
      if (owner && owner.id === id) {
        // Slug belongs to this post — safe to ignore; re-fetch and return
        return await prisma.post.findUnique({ where: { id } })
      }
    }
    handlePrismaError(err, "updatePost")
  }
}

export async function togglePublished(id: string) {
  const user = await requireAuth()

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    throw new Error("Unauthorized: only admins can publish posts")
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

export async function deletePost(id: string) {
  await requireAuth()
  try {
    await prisma.post.delete({ where: { id } })
    revalidatePath("/dashboard/blogs")
  } catch (err) {
    handlePrismaError(err, "deletePost")
  }
}

// --- Categories Actions ---
export async function getCategories() {
  await requireAuth()
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  })
}

export async function createCategory(name: string) {
  await requireAuth()
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
  await requireAuth()

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
export async function getMediaItems() {
  await requireAuth()
  return await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  })
}

export async function uploadMediaItem(formData: FormData) {
  const user = await requireAuth()
  const file = formData.get("file") as File | null
  if (!file) throw new Error("No file provided")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Clean filename to avoid directory traversal or weird symbols
  const cleanFilename = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const key = `uploads/${cleanFilename}`

  try {
    // Upload to R2 and get public URL
    const fileUrl = await uploadToR2(key, buffer, file.type)

    // Save record to DB
    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: fileUrl,
        mimeType: file.type,
        size: file.size,
        userId: user.id,
      },
    })

    revalidatePath("/dashboard/media")
    return media
  } catch (err) {
    handlePrismaError(err, "uploadMediaItem")
  }
}

export async function deleteMediaItem(id: string) {
  await requireAuth()
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
