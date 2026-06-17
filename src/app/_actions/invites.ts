"use server"

import { prisma } from "@/lib/prisma"
import { createSession, getSession } from "@/lib/session"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { Role } from "@/generated/prisma/enums"
import { ADMIN_ROLES } from "@/lib/roles"
import { INVITE_EXPIRY_MS } from "@/lib/invite-utils"

const SALT_ROUNDS = 12


export async function getInviteByToken(token: string) {
  return await prisma.userInvite.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, name: true, email: true, username: true, role: true } },
    },
  })
}

export async function getInviteByCode(code: string) {
  const normalized = code.replace("-", "").trim().toUpperCase()
  return await prisma.userInvite.findUnique({
    where: { code: normalized },
    select: { token: true, expiresAt: true, usedAt: true },
  })
}

export async function acceptInvite(token: string, password: string): Promise<void> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.")
  }

  const invite = await prisma.userInvite.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  })

  if (!invite) throw new Error("Invalid invite link. Please check the URL or contact your admin.")
  if (invite.usedAt) throw new Error("This invite has already been used. Please log in normally or request a new invite.")
  if (invite.expiresAt < new Date()) throw new Error("This invite has expired. Please ask your admin to send a new one.")

  const hashed = await bcrypt.hash(password, SALT_ROUNDS)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: { password: hashed },
    }),
    prisma.userInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  await createSession(invite.userId)
}

export async function regenerateInvite(userId: string) {
  const sessionUser = await getSession()
  if (!sessionUser) throw new Error("Unauthorized: please log in.")
  if (!(ADMIN_ROLES as readonly Role[]).includes(sessionUser.role)) {
    throw new Error("Unauthorized: only admins can regenerate invites.")
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!targetUser) throw new Error("User not found.")

  const token = randomBytes(32).toString("hex")
  const code = randomBytes(4).toString("hex").toUpperCase()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)

  await prisma.userInvite.upsert({
    where: { userId },
    update: { token, code, expiresAt, usedAt: null },
    create: {
      token,
      code,
      email: targetUser.email,
      userId,
      invitedById: sessionUser.id,
      expiresAt,
    },
  })

  revalidatePath("/dashboard/users")
  return { token, code, expiresAt }
}
