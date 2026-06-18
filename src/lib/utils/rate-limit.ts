import { prisma } from "@/lib/db/prisma"

// Token bucket per client — resets counters when the minute window rolls over.
// In serverless environments this is per-instance (best-effort), not distributed.
// For distributed enforcement, replace the store with Vercel KV or Upstash Redis.

interface Bucket {
  tokens: number
  windowStart: number // epoch ms of current 1-minute window
}

const buckets = new Map<string, Bucket>()

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

export async function checkRateLimit(clientId: string): Promise<RateLimitResult> {
  let config = await prisma.clientSecurityConfig.findUnique({
    where: { clientId },
    select: { apiRateLimitRpm: true, apiRateLimitBurst: true },
  })

  // Fall back to defaults if no config row exists
  const rpm = config?.apiRateLimitRpm ?? 60
  const burst = config?.apiRateLimitBurst ?? 10

  const now = Date.now()
  const windowMs = 60_000

  let bucket = buckets.get(clientId)

  if (!bucket || now - bucket.windowStart >= windowMs) {
    // New window — refill to burst capacity
    bucket = { tokens: burst, windowStart: now }
  }

  if (bucket.tokens <= 0) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000)
    buckets.set(clientId, bucket)
    return { allowed: false, retryAfterSeconds }
  }

  bucket.tokens -= 1
  buckets.set(clientId, bucket)
  return { allowed: true }
}

export async function getAllowedOrigins(clientId: string): Promise<string[]> {
  const config = await prisma.clientSecurityConfig.findUnique({
    where: { clientId },
    select: { allowedOrigins: true },
  })
  return config?.allowedOrigins ?? []
}

export function resolveOrigin(requestOrigin: string | null, allowedOrigins: string[]): string {
  if (!requestOrigin) return "*"
  if (allowedOrigins.length === 0) return requestOrigin // no restriction — echo back
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : "null"
}
