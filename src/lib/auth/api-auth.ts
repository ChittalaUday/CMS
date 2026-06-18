import { createHash } from "crypto"
import { prisma } from "@/lib/db/prisma"

export async function validateApiKey(request: Request): Promise<{
  clientId: string
  scopes: string[]
} | null> {
  const header =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "")
  const queryKey = new URL(request.url).searchParams.get("apiKey")
  const rawKey = header ?? queryKey

  if (!rawKey) return null

  const keyHash = createHash("sha256").update(rawKey).digest("hex")

  const apiKey = await prisma.clientApiKey.findUnique({
    where: { keyHash },
    select: { clientId: true, scopes: true, revokedAt: true, expiresAt: true },
  })

  if (!apiKey) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  prisma.clientApiKey
    .update({ where: { keyHash }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return { clientId: apiKey.clientId, scopes: apiKey.scopes }
}

export async function getClientIdFromRequestHeaders(): Promise<string | null> {
  // 1. Try session first (session token via cookies)
  try {
    const { getSession } = await import("./session")
    const user = await getSession()
    if (user?.clientId) {
      return user.clientId
    }
  } catch {
    // Ignore session errors outside request context
  }

  // 2. Try API key from headers
  try {
    const { headers } = await import("next/headers")
    const reqHeaders = await headers()
    const headerVal =
      reqHeaders.get("x-api-key") ??
      reqHeaders.get("authorization")?.replace("Bearer ", "")

    if (headerVal) {
      const keyHash = createHash("sha256").update(headerVal).digest("hex")
      const apiKey = await prisma.clientApiKey.findUnique({
        where: { keyHash },
        select: { clientId: true, revokedAt: true, expiresAt: true },
      })
      if (apiKey && !apiKey.revokedAt && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
        return apiKey.clientId
      }
    }
  } catch {
    // Ignore header access errors
  }

  return null
}

