import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { validateApiKey } from "@/lib/auth/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/utils/rate-limit"
import logger from "@/lib/utils/logger"
import { JobType } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "10", 10)))
  const skip = (page - 1) * limit

  const sortByParam = searchParams.get("sortBy") ?? "createdAt"
  const sortOrderParam = searchParams.get("sortOrder") ?? "desc"

  const allowedSortFields = ["createdAt", "updatedAt", "title"]
  const sortBy = allowedSortFields.includes(sortByParam) ? sortByParam : "createdAt"
  const sortOrder = sortOrderParam.toLowerCase() === "asc" ? "asc" : "desc"

  const department = searchParams.get("department") ?? undefined
  const location = searchParams.get("location") ?? undefined
  const jobTypeParam = searchParams.get("jobType")?.toUpperCase() ?? undefined
  const search = searchParams.get("search") ?? undefined

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 5)

    const andConditions: Prisma.JobPostingWhereInput[] = [
      {
        OR: [
          { closingDate: null },
          { closingDate: { gte: cutoffDate } }
        ]
      }
    ]

    if (search?.trim()) {
      andConditions.push({
        OR: [
          { title: { contains: search.trim(), mode: "insensitive" } },
          { description: { contains: search.trim(), mode: "insensitive" } },
          { department: { contains: search.trim(), mode: "insensitive" } },
        ]
      })
    }

    const whereClause: Prisma.JobPostingWhereInput = {
      status: "PUBLISHED",
      clientId: auth.clientId,
      AND: andConditions,
    }

    if (department?.trim()) {
      whereClause.department = {
        contains: department.trim(),
        mode: "insensitive",
      }
    }

    if (location?.trim()) {
      whereClause.location = {
        contains: location.trim(),
        mode: "insensitive",
      }
    }

    if (jobTypeParam) {
      const validJobTypes = Object.values(JobType) as string[]
      if (validJobTypes.includes(jobTypeParam)) {
        whereClause.jobType = jobTypeParam as JobType
      } else {
        return NextResponse.json(
          { error: `Invalid jobType. Allowed values: ${validJobTypes.join(", ")}` },
          { status: 400 }
        )
      }
    }

    const total = await prisma.jobPosting.count({
      where: whereClause,
    })

    const jobs = await prisma.jobPosting.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
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

    const client = await prisma.client.findUnique({
      where: { id: auth.clientId },
      select: { settings: true }
    })
    const settings = (client?.settings as any) || {}
    const careersConfig = settings.careers || {}

    const jobsResponse = jobs.map(job => {
      let globalTemplate = null;
      if (careersConfig.defaultTemplate && !job.keywords?.includes("__exclude-global-template__")) {
        globalTemplate = careersConfig.defaultTemplate;
      }
      return {
        ...job,
        globalTemplate,
        templatePosition: careersConfig.templatePosition || "start",
      }
    });

    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)
    return new NextResponse(
      JSON.stringify({
        jobs: jobsResponse,
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
    logger.error({ err }, "api/public/careers GET failed")
    return NextResponse.json({ error: "Failed to fetch job postings" }, { status: 500 })
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
