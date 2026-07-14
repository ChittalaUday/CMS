import { NextRequest, NextResponse } from "next/server"
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

  try {
    const categories = await prisma.category.findMany({
      where: {
        clientId: auth.clientId,
        posts: {
          some: {
            post: {
              published: true
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    })

    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)
    return new NextResponse(
      JSON.stringify({ categories }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
      }
    )
  } catch (err) {
    logger.error({ err }, "api/public/categories GET failed")
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
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
