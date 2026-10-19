"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { actionClient } from "@/lib/utils/safe-action"
import { getSession } from "@/lib/auth/session"
import { COMPARISONS_ACCESS_ROLES, ADMIN_ROLES, type Role } from "@/lib/auth/roles"
import { getClientScope, requireClientScope, resolveCreateClientId } from "@/lib/utils/client-context"
import { comparisonInputSchema } from "@/lib/comparisons/schema"
import {
  createComparison,
  updateComparison,
  deleteComparison,
  setComparisonPublished,
  moveComparison,
} from "@/lib/comparisons/service"
import { generateNextAvailableSlug, parseSlugBase, toSlug } from "@/lib/careers/slug-helper"

async function requireComparisonsAccess() {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized: please log in.")
  if (!(COMPARISONS_ACCESS_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: you do not have access to comparisons.")
  }
  return user
}

async function requireComparisonsAdmin() {
  const user = await requireComparisonsAccess()
  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can delete comparisons.")
  }
  return user
}

const idSchema = z.object({ id: z.string().min(1) })

function revalidate(id?: string) {
  revalidatePath("/dashboard/comparisons")
  if (id) revalidatePath(`/dashboard/comparisons/${id}/edit`)
}

export const createComparisonAction = actionClient
  .inputSchema(comparisonInputSchema.extend({ clientId: z.string().optional() }))
  .action(async ({ parsedInput: { clientId: requested, ...input } }) => {
    await requireComparisonsAccess()
    const clientId = await resolveCreateClientId(requested)
    const comparison = await createComparison(clientId, input)
    revalidate()
    return { id: comparison.id }
  })

export const updateComparisonAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1), data: comparisonInputSchema }))
  .action(async ({ parsedInput }) => {
    await requireComparisonsAccess()
    const clientId = await getClientScope()
    await updateComparison(clientId, parsedInput.id, parsedInput.data)
    revalidate(parsedInput.id)
    return { id: parsedInput.id }
  })

export const deleteComparisonAction = actionClient.inputSchema(idSchema).action(async ({ parsedInput }) => {
  await requireComparisonsAdmin()
  await deleteComparison(await getClientScope(), parsedInput.id)
  revalidate()
  return { success: true }
})

export const togglePublishComparisonAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1), published: z.boolean() }))
  .action(async ({ parsedInput }) => {
    await requireComparisonsAccess()
    await setComparisonPublished(await getClientScope(), parsedInput.id, parsedInput.published)
    revalidate(parsedInput.id)
    return { published: parsedInput.published }
  })

export const reorderComparisonAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1), direction: z.enum(["up", "down"]) }))
  .action(async ({ parsedInput }) => {
    await requireComparisonsAccess()
    await moveComparison(await requireClientScope(), parsedInput.id, parsedInput.direction)
    revalidate()
    return { success: true }
  })

export async function checkComparisonSlugAvailability(
  slug: string,
  excludeId?: string,
  forClientId?: string
): Promise<{ available: boolean; suggestedSlug?: string }> {
  await requireComparisonsAccess()
  // Editing keeps the active client's scope; a new comparison may target the client picked in the form
  const clientId = excludeId ? await requireClientScope() : await resolveCreateClientId(forClientId)
  const clean = toSlug(slug)
  if (!clean) return { available: true }

  const notSelf = excludeId ? { id: { not: excludeId } } : {}
  const taken = await prisma.comparison.findFirst({ where: { slug: clean, clientId, ...notSelf }, select: { id: true } })
  if (!taken) return { available: true }

  const { base } = parseSlugBase(clean)
  const siblings = await prisma.comparison.findMany({
    where: { clientId, slug: { startsWith: base }, ...notSelf },
    select: { slug: true },
  })
  return { available: false, suggestedSlug: generateNextAvailableSlug(clean, siblings.map((s) => s.slug)) }
}
