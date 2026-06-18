"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { Role } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { randomBytes, createHash } from "crypto"
import { z } from "zod"
import { actionClient } from "@/lib/safe-action"

async function requireSuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: SUPER_ADMIN only")
  }
  return session
}

// ── Client CRUD ───────────────────────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  domain: z.string()
    .transform(v => v === "" ? undefined : v)
    .optional()
    .refine(
      val => !val || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i.test(val),
      "Invalid domain format (e.g., example.com)"
    ),
  description: z.string().optional(),
  logoUrl: z.string()
    .transform(v => v === "" ? undefined : v)
    .optional()
    .refine(
      val => !val || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(val),
      "Invalid URL format"
    ),
})

export const createClient = actionClient
  .inputSchema(clientSchema)
  .action(async ({ parsedInput: data }) => {
    const session = await requireSuperAdmin()

    const existing = await prisma.client.findUnique({ where: { slug: data.slug } })
    if (existing) throw new Error("A client with this slug already exists.")

    const client = await prisma.client.create({
      data: {
        name: data.name,
        slug: data.slug,
        domain: data.domain || null,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        createdById: session.id,
      },
    })

    const jar = await cookies()
    jar.set("cms_active_client", client.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/dashboard",
    })

    revalidatePath("/dashboard/clients")
    return client
  })

export const updateClient = actionClient
  .inputSchema(clientSchema.extend({ id: z.string() }))
  .action(async ({ parsedInput: { id, ...data } }) => {
    await requireSuperAdmin()

    const existing = await prisma.client.findUnique({ where: { slug: data.slug } })
    if (existing && existing.id !== id) throw new Error("A client with this slug already exists.")

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        domain: data.domain || null,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
      },
    })

    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${id}`)
    return client
  })

export async function suspendClient(id: string, suspend: boolean) {
  await requireSuperAdmin()
  const client = await prisma.client.update({
    where: { id },
    data: { status: suspend ? "SUSPENDED" : "ACTIVE" },
  })
  revalidatePath("/dashboard/clients")
  revalidatePath(`/dashboard/clients/${id}`)
  return client
}

export async function deleteClient(id: string) {
  await requireSuperAdmin()
  await prisma.client.delete({ where: { id } })
  revalidatePath("/dashboard/clients")
}

export async function removeUserFromClient(userId: string) {
  await requireSuperAdmin()
  await prisma.user.update({ where: { id: userId }, data: { clientId: null } })
  revalidatePath("/dashboard/clients")
}

// ── Single client fetch ───────────────────────────────────────────────────────

export async function getClientById(id: string) {
  await requireSuperAdmin()
  return await prisma.client.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      users: {
        where: { role: { not: "SUPER_ADMIN" } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

// ── Client stats ─────────────────────────────────────────────────────────────

export async function getClientStats(clientId: string) {
  await requireSuperAdmin()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [userCount, postCount, jobCount, applicationCount] = await Promise.all([
    prisma.user.count({ where: { clientId } }),
    prisma.post.count({ where: { clientId, published: true } }),
    prisma.jobPosting.count({ where: { clientId, status: "PUBLISHED" } }),
    prisma.jobApplication.count({
      where: { job: { clientId }, createdAt: { gte: startOfMonth } },
    }),
  ])

  return { userCount, postCount, jobCount, applicationCount }
}

// ── API Key management ────────────────────────────────────────────────────────

import { getAllScopeIds } from "@/lib/api-registry"

export async function listApiKeys(clientId: string) {
  await requireSuperAdmin()
  return await prisma.clientApiKey.findMany({
    where: { clientId },
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

export async function generateApiKey(
  clientId: string,
  name: string,
  scopes: string[],
  expiresAt?: Date
) {
  const session = await requireSuperAdmin()

  // Verify client exists and is ACTIVE
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, status: true },
  })
  if (!client) throw new Error("Client not found")
  if (client.status !== "ACTIVE") throw new Error("Cannot create API keys for a suspended or inactive client")

  // Validate scopes against the registry
  const validScopes = getAllScopeIds()
  const filteredScopes = scopes.filter((s) => validScopes.includes(s))
  if (filteredScopes.length === 0) throw new Error("Select at least one valid scope")

  const rawKey = "cms_live_" + randomBytes(32).toString("hex")
  const keyHash = createHash("sha256").update(rawKey).digest("hex")
  const keyPrefix = rawKey.slice(0, 16) + "..."

  await prisma.clientApiKey.create({
    data: {
      clientId,
      name,
      keyHash,
      keyPrefix,
      scopes: filteredScopes,
      expiresAt: expiresAt ?? null,
      createdById: session.id,
    },
  })

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { rawKey, keyPrefix }
}

export async function revokeApiKey(keyId: string, clientId: string) {
  await requireSuperAdmin()

  // Verify the key actually belongs to this client before revoking
  const key = await prisma.clientApiKey.findFirst({
    where: { id: keyId, clientId },
    select: { id: true, revokedAt: true },
  })
  if (!key) throw new Error("API key not found for this client")
  if (key.revokedAt) throw new Error("API key is already revoked")

  await prisma.clientApiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })
  revalidatePath(`/dashboard/clients/${clientId}`)
}

// ── Paginated client list ─────────────────────────────────────────────────────

export async function getClientsPaginated(params: {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  await requireSuperAdmin()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15))
  const skip = (page - 1) * pageSize

  const where: { status?: "ACTIVE" | "SUSPENDED" | "INACTIVE"; OR?: object[] } = {}

  if (params.status && ["ACTIVE", "SUSPENDED", "INACTIVE"].includes(params.status)) {
    where.status = params.status as "ACTIVE" | "SUSPENDED" | "INACTIVE"
  }

  if (params.search?.trim()) {
    where.OR = [
      { name: { contains: params.search.trim(), mode: "insensitive" } },
      { slug: { contains: params.search.trim(), mode: "insensitive" } },
      { domain: { contains: params.search.trim(), mode: "insensitive" } },
    ]
  }

  const [clients, totalCount] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        _count: { select: { users: true, posts: true, apiKeys: true } },
      },
    }),
    prisma.client.count({ where }),
  ])

  return { clients, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) }
}
