import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { validateApiKey } from "@/lib/auth/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/utils/rate-limit"
import logger from "@/lib/utils/logger"

export async function POST(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}))
    const { slug, postId } = body

    let targetPostId = postId

    if (!targetPostId && slug) {
      const post = await prisma.post.findFirst({
        where: { slug, clientId: auth.clientId },
        select: { id: true },
      })
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      }
      targetPostId = post.id
    }

    if (!targetPostId) {
      return NextResponse.json({ error: "slug or postId is required" }, { status: 400 })
    }

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined
    const userAgent = request.headers.get("user-agent") ?? undefined

    await prisma.view.create({
      data: { postId: targetPostId, ipAddress, userAgent },
    })

    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)
    return new NextResponse(JSON.stringify({ success: true, message: "View recorded" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    })
  } catch (err) {
    logger.error({ err }, "api/public/blogs/view POST failed")
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*"
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    },
  })
}
