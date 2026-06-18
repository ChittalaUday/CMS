import "server-only"
import { getSession } from "@/lib/auth/session"
import { Role } from "@/generated/prisma/enums"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db/prisma"

export async function getClientScope(): Promise<string | null> {
  const session = await getSession()
  if (!session) throw new Error("Unauthenticated")

  if (session.role === Role.SUPER_ADMIN) {
    const jar = await cookies()
    const activeClientId = jar.get("cms_active_client")?.value ?? null
    if (activeClientId) {
      const client = await prisma.client.findUnique({
        where: { id: activeClientId },
        select: { status: true },
      })
      if (!client || client.status !== "ACTIVE") {
        return null
      }
    }
    return activeClientId
  }

  if (!session.clientId) throw new Error("User has no client assigned")
  return session.clientId
}

export async function requireClientScope(): Promise<string> {
  const scope = await getClientScope()
  if (!scope) throw new Error("No client scope — provide a clientId")
  return scope
}
