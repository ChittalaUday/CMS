import { prisma } from "@/lib/db/prisma"
import { ApplicationStatus } from "@/generated/prisma/enums"
import { since, bucketByDate } from "./query-utils"

export type AppsByDay = { date: string; count: number }[]
export type FunnelRow = {
  jobId: string
  jobTitle: string
  NEW: number
  REVIEWING: number
  SHORTLISTED: number
  REJECTED: number
  HIRED: number
}
export type ActiveJobRow = {
  id: string
  title: string
  department: string
  location: string
  jobType: string
  createdAt: Date
  closingDate: Date | null
  _count: {
    applications: number
  }
}

export type ATSRow = { jobTitle: string; avgScore: number; count: number }
export type AppPerJob = { jobTitle: string; count: number }

export type CareersStats = {
  openJobs: number
  newApplications: number
  appsPerDay: AppsByDay
  funnelByJob: FunnelRow[]
  atsScores: ATSRow[]
  appsPerJob: AppPerJob[]
  activeJobs: ActiveJobRow[]
}

export async function fetchCareersStats(opts: {
  clientId: string | null
  days: number
}): Promise<CareersStats> {
  const { clientId, days } = opts
  const jobFilter = clientId ? { clientId } : {}
  const sinceDate = since(days)

  const [openJobs, newApplications, recentApps, funnelRaw, jobsWithApps, activeJobs] =
    await Promise.all([
      prisma.jobPosting.count({ where: { ...jobFilter, status: "PUBLISHED" } }),
      prisma.jobApplication.count({
        where: { createdAt: { gte: sinceDate }, job: jobFilter },
      }),
      prisma.jobApplication.findMany({
        where: { createdAt: { gte: sinceDate }, job: jobFilter },
        select: { createdAt: true },
      }),
      prisma.jobApplication.groupBy({
        by: ["jobId", "status"],
        _count: { id: true },
        where: { job: jobFilter },
      }),
      prisma.jobPosting.findMany({
        where: jobFilter,
        select: {
          id: true,
          title: true,
          applications: {
            select: { atsScore: true, status: true },
          },
        },
        orderBy: { applications: { _count: "desc" } },
        take: 10,
      }),
      prisma.jobPosting.findMany({
        where: { ...jobFilter, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          jobType: true,
          createdAt: true,
          closingDate: true,
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

  // Apps per day
  const appBuckets = bucketByDate(recentApps, days)
  const appsPerDay: AppsByDay = Array.from(appBuckets.entries()).map(
    ([date, rows]) => ({ date, count: rows.length })
  )

  // Funnel: group by jobId, then pivot statuses
  const jobTitleMap = new Map(jobsWithApps.map((j) => [j.id, j.title]))

  // Get all unique jobIds from funnel
  const allJobIds = [...new Set(funnelRaw.map((r) => r.jobId))]
  // Fetch titles for jobs not in the top-10 list
  const missingIds = allJobIds.filter((id) => !jobTitleMap.has(id))
  if (missingIds.length > 0) {
    const extra = await prisma.jobPosting.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, title: true },
    })
    for (const j of extra) jobTitleMap.set(j.id, j.title)
  }

  const funnelMap = new Map<string, FunnelRow>()
  const statusKeys = Object.values(ApplicationStatus)
  for (const row of funnelRaw) {
    if (!funnelMap.has(row.jobId)) {
      funnelMap.set(row.jobId, {
        jobId: row.jobId,
        jobTitle: (jobTitleMap.get(row.jobId) ?? row.jobId).slice(0, 30),
        NEW: 0,
        REVIEWING: 0,
        SHORTLISTED: 0,
        REJECTED: 0,
        HIRED: 0,
      })
    }
    const entry = funnelMap.get(row.jobId)!
    if (statusKeys.includes(row.status as ApplicationStatus)) {
      entry[row.status as ApplicationStatus] = row._count.id
    }
  }
  const funnelByJob = [...funnelMap.values()].slice(0, 8)

  // ATS scores + apps per job from top jobs
  const atsScores: ATSRow[] = jobsWithApps
    .map((j) => {
      const scored = j.applications.filter(
        (a): a is { atsScore: number; status: ApplicationStatus } =>
          a.atsScore !== null
      )
      if (scored.length === 0) return null
      const avg = Math.round(
        scored.reduce((s, a) => s + a.atsScore, 0) / scored.length
      )
      return { jobTitle: j.title.slice(0, 30), avgScore: avg, count: j.applications.length }
    })
    .filter((r): r is ATSRow => r !== null)

  const appsPerJob: AppPerJob[] = jobsWithApps.map((j) => ({
    jobTitle: j.title.slice(0, 24),
    count: j.applications.length,
  }))

  return {
    openJobs,
    newApplications,
    appsPerDay,
    funnelByJob,
    atsScores,
    appsPerJob,
    activeJobs,
  }
}
