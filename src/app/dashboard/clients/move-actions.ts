"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { Role } from "@/generated/prisma/enums"

export type MovableKind = "post" | "job" | "comparison" | "user"

/** Super admin only: reassign a record to another client. Category links of a post are dropped (categories belong to a client). */
export async function moveRecordToClient(kind: MovableKind, id: string, clientId: string) {
  const session = await getSession()
  if (!session || session.role !== Role.SUPER_ADMIN) throw new Error("Unauthorized: SUPER_ADMIN only")

  const target = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true, status: true } })
  if (!target || target.status !== "ACTIVE") throw new Error("The selected client is not available.")
  const clash = (what: string) => new Error(`${target.name} already has a ${what} with this URL slug. Change the slug first.`)

  if (kind === "post") {
    const post = await prisma.post.findUnique({ where: { id }, select: { clientId: true, slug: true, draftParentId: true } })
    if (!post) throw new Error("Post not found.")
    if (post.draftParentId) throw new Error("Move the published post, not its revision.")
    if (post.clientId === clientId) return
    if (await prisma.post.findFirst({ where: { clientId, slug: post.slug }, select: { id: true } })) throw clash("post")
    const family = { OR: [{ id }, { draftParentId: id }] }
    await prisma.$transaction([
      prisma.postCategory.deleteMany({ where: { post: family } }),
      prisma.post.updateMany({ where: family, data: { clientId } }),
    ])
    revalidatePath("/dashboard/blogs")
  } else if (kind === "job") {
    const job = await prisma.jobPosting.findUnique({ where: { id }, select: { clientId: true, slug: true, draftParentId: true } })
    if (!job) throw new Error("Job not found.")
    if (job.draftParentId) throw new Error("Move the job, not its draft.")
    if (job.clientId === clientId) return
    if (await prisma.jobPosting.findFirst({ where: { clientId, slug: job.slug }, select: { id: true } })) throw clash("job")
    await prisma.jobPosting.updateMany({ where: { OR: [{ id }, { draftParentId: id }] }, data: { clientId } })
    revalidatePath("/dashboard/careers")
  } else if (kind === "comparison") {
    const cmp = await prisma.comparison.findUnique({ where: { id }, select: { clientId: true, slug: true } })
    if (!cmp) throw new Error("Comparison not found.")
    if (cmp.clientId === clientId) return
    if (await prisma.comparison.findFirst({ where: { clientId, slug: cmp.slug }, select: { id: true } })) throw clash("comparison")
    const last = await prisma.comparison.aggregate({ where: { clientId }, _max: { position: true } })
    await prisma.comparison.update({ where: { id }, data: { clientId, position: (last._max.position ?? -1) + 1 } })
    revalidatePath("/dashboard/comparisons")
  } else {
    const user = await prisma.user.findUnique({ where: { id }, select: { clientId: true, role: true } })
    if (!user) throw new Error("User not found.")
    if (user.role === Role.SUPER_ADMIN) throw new Error("A super admin does not belong to a client.")
    if (user.clientId === clientId) return
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { clientId } }),
      prisma.userInvite.updateMany({ where: { userId: id }, data: { clientId } }),
    ])
    revalidatePath("/dashboard/users")
  }
}
