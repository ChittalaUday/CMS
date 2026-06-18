"use server"

import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { actionClient } from "@/lib/utils/safe-action"
import { Role } from "@/generated/prisma/enums"
import { getAllScopeIds } from "@/lib/utils/api-registry"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const TOKEN_PREFIX = "cms_"

async function requireAdminWithClient() {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) throw new Error("Unauthorized: ADMIN only")
  if (!user.clientId) throw new Error("Your account is not associated with a client")

  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    select: { id: true, status: true, name: true },
  })
  if (!client) throw new Error("Associated client not found")
  if (client.status !== "ACTIVE") throw new Error(`Client "${client.name}" is suspended or inactive`)

  return { user, clientId: user.clientId }
}

export const createApiToken = actionClient
  .inputSchema(
    z.object({
      name: z.string().min(1, "Name is required").max(100),
      scopes: z.array(z.string()).min(1, "Select at least one scope"),
      expiresAt: z.iso.datetime().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const { user, clientId } = await requireAdminWithClient()

    const validScopes = getAllScopeIds()
    const scopes = parsedInput.scopes.filter((s) => validScopes.includes(s))
    if (scopes.length === 0) throw new Error("No valid scopes selected")

    const rawKey = TOKEN_PREFIX + randomBytes(32).toString("hex")
    const keyHash = createHash("sha256").update(rawKey).digest("hex")
    const keyPrefix = rawKey.slice(0, 12) + "…"

    await prisma.clientApiKey.create({
      data: {
        clientId,
        name: parsedInput.name,
        keyHash,
        keyPrefix,
        scopes,
        expiresAt: parsedInput.expiresAt ? new Date(parsedInput.expiresAt) : null,
        createdById: user.id,
      },
    })

    revalidatePath("/dashboard/settings/api-tokens")
    return { rawKey }
  })

export const revokeApiToken = actionClient
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const { clientId } = await requireAdminWithClient()

    // Verify the key belongs to this exact client before revoking
    const key = await prisma.clientApiKey.findFirst({
      where: { id: parsedInput.id, clientId },
      select: { id: true, revokedAt: true },
    })
    if (!key) throw new Error("Token not found for your client")
    if (key.revokedAt) throw new Error("Token is already revoked")

    await prisma.clientApiKey.update({
      where: { id: parsedInput.id },
      data: { revokedAt: new Date() },
    })

    revalidatePath("/dashboard/settings/api-tokens")
    return { success: true }
  })

export async function listApiTokens() {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN || !user.clientId) return []

  return prisma.clientApiKey.findMany({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: { select: { name: true, username: true } },
    },
  })
}
