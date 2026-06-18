import "server-only"
import { cookies } from "next/headers"
import { cache } from "react"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/db/prisma"

const SESSION_COOKIE = "session_token"
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await prisma.session.create({ data: { id: token, userId, expiresAt } })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {})
    cookieStore.delete(SESSION_COOKIE)
  }
}

export const getSession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          role: true,
          avatarUrl: true,
          onboardingCompleted: true,
          clientId: true,
          client: { select: { status: true } },
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: token } }).catch(() => {})
    }
    return null
  }

  const user = session.user
  if (user.role !== "SUPER_ADMIN" && user.clientId && user.client?.status !== "ACTIVE") {
    return null
  }

  return user
})
