import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { validateApiKey } from "@/lib/auth/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/utils/rate-limit"
import logger from "@/lib/utils/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 })
  }
  if (!auth.scopes.includes("read:careers")) {
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
    const { slug } = await params
    const job = await prisma.jobPosting.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        clientId: auth.clientId,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            question: true,
            type: true,
            required: true,
            order: true,
            options: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Job posting not found or is not published" }, { status: 404 })
    }

    const isExpired = job.closingDate && new Date(job.closingDate) < new Date()
    if (isExpired) {
      job.questions = []
    }

    const client = await prisma.client.findUnique({
      where: { id: auth.clientId },
      select: { settings: true }
    })
    const settings = (client?.settings as any) || {}
    const careersConfig = settings.careers || {}
    
    let globalTemplate = null;
    if (careersConfig.defaultTemplate && !job.keywords?.includes("__exclude-global-template__")) {
      globalTemplate = careersConfig.defaultTemplate;
    }

    const jobResponse = {
      ...job,
      globalTemplate,
      templatePosition: careersConfig.templatePosition || "start",
    }

    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)
    return new NextResponse(JSON.stringify({ job: jobResponse }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    })
  } catch (err) {
    logger.error({ err }, "api/public/careers/[slug] GET failed")
    return NextResponse.json({ error: "Failed to fetch job posting" }, { status: 500 })
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
