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

/** Client for a new record. Only a super admin may pick one (`requested`); everyone else gets their own client. */
export async function resolveCreateClientId(requested?: string | null): Promise<string> {
  const session = await getSession()
  if (!session) throw new Error("Unauthenticated")

  if (session.role === Role.SUPER_ADMIN && requested) {
    const client = await prisma.client.findUnique({ where: { id: requested }, select: { status: true } })
    if (!client || client.status !== "ACTIVE") throw new Error("The selected client is not available.")
    return requested
  }

  const scope = await getClientScope()
  if (!scope) throw new Error("Select a client for this record.")
  return scope
}

/** Clients a super admin can create records for, and the header's active one. Empty for everyone else. */
export async function getClientChoices(): Promise<{ clients: { id: string; name: string }[]; activeClientId: string | null }> {
  const session = await getSession()
  if (!session || session.role !== Role.SUPER_ADMIN) return { clients: [], activeClientId: null }

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  const active = (await cookies()).get("cms_active_client")?.value ?? null
  return { clients, activeClientId: clients.some((c) => c.id === active) ? active : null }
}
