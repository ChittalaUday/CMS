import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { validateApiKey } from "@/lib/auth/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/utils/rate-limit"
import logger from "@/lib/utils/logger"

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 })
  }
  if (!auth.scopes.includes("read:blogs")) {
    return NextResponse.json({ error: "Insufficient scope" }, { status: 403 })
  }

  const rl = await checkRateLimit(auth.clientId, request)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "10", 10)))
  const skip = (page - 1) * limit

  const sortByParam = searchParams.get("sortBy") ?? "createdAt"
  const sortOrderParam = searchParams.get("sortOrder") ?? "desc"

  const allowedSortFields = ["createdAt", "updatedAt", "title"]
  const sortBy = allowedSortFields.includes(sortByParam) ? sortByParam : "createdAt"
  const sortOrder = sortOrderParam.toLowerCase() === "asc" ? "asc" : "desc"

  const category = searchParams.get("category") ?? undefined

  try {
    const whereClause: Prisma.PostWhereInput = {
      published: true,
      clientId: auth.clientId,
    }

    if (category) {
      whereClause.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      }
    }

    const total = await prisma.post.count({
      where: whereClause,
    })

    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        featured: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
        featuredImage: { select: { id: true, filename: true, url: true, mimeType: true, size: true } },
        categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
      },
    })

    const formattedPosts = posts.map((post) => ({
      ...post,
      categories: post.categories.map((c) => c.category),
    }))

    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)
    return new NextResponse(
      JSON.stringify({
        posts: formattedPosts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
      }
    )
  } catch (err) {
    logger.error({ err }, "api/public/blogs GET failed")
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*"
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    },
  })
}
