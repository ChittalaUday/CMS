"use server"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { Role } from "@/generated/prisma/enums"
import { getSession } from "@/lib/auth/session"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { actionClient } from "@/lib/utils/safe-action"
import { z } from "zod"
import {
  ADMIN_ROLES,
  MANAGEABLE_BY_SUPER_ADMIN,
  MANAGEABLE_BY_ADMIN,
} from "@/lib/auth/roles"
import { INVITE_EXPIRY_MS } from "@/lib/auth/invite-utils"
import { getClientScope } from "@/lib/utils/client-context"

const SALT_ROUNDS = 12

async function ensureAdmin() {
  const sessionUser = await getSession()
  if (!sessionUser || !(ADMIN_ROLES as readonly Role[]).includes(sessionUser.role)) {
    throw new Error("Unauthorized: Access denied")
  }
  return sessionUser
}

export async function getEditors() {
  const sessionUser = await ensureAdmin()
  const clientId = await getClientScope()

  const manageableRoles = sessionUser.role === Role.SUPER_ADMIN
    ? MANAGEABLE_BY_SUPER_ADMIN
    : MANAGEABLE_BY_ADMIN

  return await prisma.user.findMany({
    where: {
      role: { in: [...manageableRoles] },
      ...(clientId ? { clientId } : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      onboardingCompleted: true,
      createdAt: true,
      invite: {
        select: { token: true, code: true, expiresAt: true, usedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getEditorsPaginated(params: {
  search?: string
  role?: string
  page?: number
  pageSize?: number
}) {
  const sessionUser = await ensureAdmin()
  const clientId = await getClientScope()

  const manageableRoles = sessionUser.role === Role.SUPER_ADMIN
    ? MANAGEABLE_BY_SUPER_ADMIN
    : MANAGEABLE_BY_ADMIN

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15))
  const skip = (page - 1) * pageSize

  const where: Prisma.UserWhereInput = {
    role: { in: [...manageableRoles] },
    ...(clientId ? { clientId } : {}),
  }

  if (params.role && params.role !== "all") {
    if ((manageableRoles as readonly string[]).includes(params.role)) {
      where.role = params.role as Role
    }
  }

  if (params.search?.trim()) {
    const query = params.search.trim()
    where.OR = [
      { email: { contains: query, mode: "insensitive" } },
      { username: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
    ]
  }

  const [editors, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        onboardingCompleted: true,
        createdAt: true,
        invite: {
          select: { token: true, code: true, expiresAt: true, usedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    editors,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

export const createEditor = actionClient
  .inputSchema(
    z.object({
      email: z.string().email("Invalid email format"),
      username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username cannot contain spaces or special characters"),
      name: z.string().min(1, "Name is required"),
      role: z.enum(["ADMIN", "HR", "EDITOR"]).optional(),
    })
  )
  .action(async ({ parsedInput: data }) => {
    const sessionUser = await ensureAdmin()

    const allowedRoles: Role[] =
      sessionUser.role === Role.SUPER_ADMIN
        ? [...MANAGEABLE_BY_SUPER_ADMIN]
        : [...MANAGEABLE_BY_ADMIN]

    const targetRole: Role =
      data.role && (allowedRoles as string[]).includes(data.role)
        ? (data.role as Role)
        : Role.EDITOR

    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } })
    if (existingEmail) throw new Error("Email already registered")

    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } })
    if (existingUsername) throw new Error("Username already taken")

    // Random inaccessible temp password — real password set during invite acceptance
    const tempPassword = await bcrypt.hash(randomBytes(32).toString("hex"), SALT_ROUNDS)

    const token = randomBytes(32).toString("hex")
    const code = randomBytes(4).toString("hex").toUpperCase()
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)

    const clientId = await getClientScope()
    const assignedClientId = sessionUser.role === Role.SUPER_ADMIN
      ? (sessionUser.clientId ?? clientId)
      : sessionUser.clientId

    if (targetRole !== Role.SUPER_ADMIN && !assignedClientId) {
      throw new Error("Please select an active client from the header before inviting a user.")
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.name,
        password: tempPassword,
        role: targetRole,
        onboardingCompleted: false,
        clientId: assignedClientId ?? undefined,
        invite: {
          create: {
            token,
            code,
            email: data.email,
            invitedById: sessionUser.id,
            expiresAt,
            clientId: assignedClientId ?? undefined,
          },
        },
      },
    })

    revalidatePath("/dashboard/users")
    return { id: user.id, email: user.email, invite: { token, code, expiresAt } }
  })

export const updateEditor = actionClient
  .inputSchema(
    z.object({
      id: z.string(),
      email: z.string().email("Invalid email format"),
      username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username cannot contain spaces or special characters"),
      name: z.string().min(1, "Name is required"),
      password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
      role: z.enum(["ADMIN", "HR", "EDITOR"]).optional(),
    })
  )
  .action(async ({ parsedInput: { id, ...data } }) => {
    const sessionUser = await ensureAdmin()

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw new Error("User not found")

    if (sessionUser.role !== Role.SUPER_ADMIN && existing.clientId !== sessionUser.clientId) {
      throw new Error("You are not authorized to manage this account.")
    }

    const manageableRoles: readonly Role[] =
      sessionUser.role === Role.SUPER_ADMIN
        ? MANAGEABLE_BY_SUPER_ADMIN
        : MANAGEABLE_BY_ADMIN

    if (!(manageableRoles as readonly Role[]).includes(existing.role)) {
      throw new Error("You are not authorized to manage this account.")
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    })
    if (existingEmail) throw new Error("Email already registered")

    const existingUsername = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id } },
    })
    if (existingUsername) throw new Error("Username already taken")

    const updateData: Prisma.UserUpdateInput = {
      email: data.email,
      username: data.username,
      name: data.name,
    }

    if (data.role && (manageableRoles as readonly string[]).includes(data.role)) {
      updateData.role = data.role as Role
    }

    if (data.password && data.password.trim() !== "") {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS)
    }

    const user = await prisma.user.update({ where: { id }, data: updateData })

    revalidatePath("/dashboard/users")
    return { id: user.id, email: user.email }
  })

export const deleteEditor = actionClient
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    const sessionUser = await ensureAdmin()

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw new Error("User not found")

    if (sessionUser.role !== Role.SUPER_ADMIN && existing.clientId !== sessionUser.clientId) {
      throw new Error("You are not authorized to delete this account.")
    }

    const manageableRoles: readonly Role[] =
      sessionUser.role === Role.SUPER_ADMIN
        ? MANAGEABLE_BY_SUPER_ADMIN
        : MANAGEABLE_BY_ADMIN

    if (!(manageableRoles as readonly Role[]).includes(existing.role)) {
      throw new Error("You are not authorized to delete this account.")
    }

    await prisma.user.delete({ where: { id } })

    revalidatePath("/dashboard/users")
    return { success: true }
  })
