import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/rate-limit"
import logger from "@/lib/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 })
  }
  if (!auth.scopes.includes("read:blogs")) {
    return NextResponse.json({ error: "Insufficient scope" }, { status: 403 })
  }

  const rl = await checkRateLimit(auth.clientId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  try {
    const { slug } = await params
    const post = await prisma.post.findFirst({
      where: { slug, published: true, clientId: auth.clientId },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentJson: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
        featuredImage: { select: { id: true, filename: true, url: true, mimeType: true, size: true } },
        categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found or is not published" }, { status: 404 })
    }

    const formattedPost = { ...post, categories: post.categories.map((c) => c.category) }
    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)
    return new NextResponse(JSON.stringify({ post: formattedPost }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    })
  } catch (err) {
    logger.error({ err }, "api/public/blogs/[slug] GET failed")
    return NextResponse.json({ error: "Failed to fetch blog post" }, { status: 500 })
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
