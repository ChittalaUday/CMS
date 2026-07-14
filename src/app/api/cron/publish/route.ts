import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 })
  }

  const now = new Date()

  // Publish scheduled draft posts (top-level only, not revisions)
  const publishedPosts = await prisma.post.updateMany({
    where: {
      scheduledAt: { lte: now },
      published: false,
      draftParentId: null,
    },
    data: { published: true, scheduledAt: null },
  })

  // Apply scheduled draft revisions to their parent posts
  const scheduledRevisions = await prisma.post.findMany({
    where: {
      scheduledAt: { lte: now },
      draftParentId: { not: null },
    },
    include: { categories: true },
  })

  let appliedRevisions = 0
  for (const draft of scheduledRevisions) {
    if (!draft.draftParentId) continue
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
            featured: draft.featured,
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
        await tx.post.delete({ where: { id: draft.id } })
      })
      appliedRevisions++
    } catch (err) {
      console.error(`[cron/publish] Failed to apply revision ${draft.id}:`, err)
    }
  }

  // Auto-close jobs that are 5+ days past their closingDate
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
  const closedJobs = await prisma.jobPosting.updateMany({
    where: {
      status: { not: "CLOSED" },
      closingDate: { lte: fiveDaysAgo },
    },
    data: { status: "CLOSED" },
  })

  return Response.json({
    ok: true,
    publishedPosts: publishedPosts.count,
    appliedRevisions,
    closedJobsCount: closedJobs.count,
  })
}
