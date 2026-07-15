import { prisma } from "@/lib/db/prisma"
import { since, bucketByDate } from "./query-utils"

export type ViewsByDay = { date: string; views: number }[]
export type LikesByDay = { date: string; likes: number }[]
export type EngagementByDay = { date: string; views: number; likes: number }[]
export type TopPost = {
  id: string
  title: string
  slug: string
  views: number
  likes: number
  createdAt: Date
}

export type BlogStats = {
  totalPosts: number
  totalViews: number
  viewsPerDay: ViewsByDay
  topPosts: TopPost[]
  engagementByDay: EngagementByDay
}

export async function fetchBlogStats(opts: {
  clientId: string | null
  userId?: string
  days: number
}): Promise<BlogStats> {
  const { clientId, userId, days } = opts
  const clientFilter = clientId ? { clientId } : {}
  const authorFilter = userId ? { authorId: userId } : {}
  const postFilter = { published: true, ...clientFilter, ...authorFilter }
  const sinceDate = since(days)

  const [totalPosts, totalViews, recentViews, recentLikes, topPostsRaw] =
    await Promise.all([
      prisma.post.count({ where: postFilter }),
      prisma.view.count({ where: { post: postFilter } }),
      prisma.view.findMany({
        where: { createdAt: { gte: sinceDate }, post: postFilter },
        select: { createdAt: true },
      }),
      prisma.like.findMany({
        where: { createdAt: { gte: sinceDate }, post: postFilter },
        select: { createdAt: true },
      }),
      prisma.post.findMany({
        where: postFilter,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          _count: { select: { views: true, likes: true } },
        },
        orderBy: { views: { _count: "desc" } },
        take: 10,
      }),
    ])

  const viewBuckets = bucketByDate(recentViews, days)
  const likeBuckets = bucketByDate(recentLikes, days)

  const viewsPerDay: ViewsByDay = []
  const engagementByDay: EngagementByDay = []

  for (const [date, vs] of viewBuckets) {
    const lks = likeBuckets.get(date) ?? []
    viewsPerDay.push({ date, views: vs.length })
    engagementByDay.push({ date, views: vs.length, likes: lks.length })
  }

  return {
    totalPosts,
    totalViews,
    viewsPerDay,
    topPosts: topPostsRaw.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      createdAt: p.createdAt,
      views: p._count.views,
      likes: p._count.likes,
    })),
    engagementByDay,
  }
}
