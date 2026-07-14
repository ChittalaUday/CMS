import { prisma } from "@/lib/db/prisma"

// Token bucket per client — resets counters when the minute window rolls over.
// In serverless environments this is per-instance (best-effort), not distributed.
// For distributed enforcement, replace the store with Vercel KV or Upstash Redis.

interface Bucket {
  tokens: number
  lastRefill: number // epoch ms of the last token refill
}

const buckets = new Map<string, Bucket>()

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

export async function checkRateLimit(clientId: string, request?: Request): Promise<RateLimitResult> {
  const config = await prisma.clientSecurityConfig.findUnique({
    where: { clientId },
    select: { apiRateLimitRpm: true, apiRateLimitBurst: true },
  })

  // Fall back to defaults if no config row exists
  const rpm = config?.apiRateLimitRpm ?? 300
  const burst = config?.apiRateLimitBurst ?? 100

  const now = Date.now()

  let bucketKey = clientId
  if (request) {
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip")
    if (ip) {
      bucketKey = `${clientId}:${ip}`
    }
  }

  let bucket = buckets.get(bucketKey)

  // Token bucket configuration
  const maxTokens = Math.max(rpm, burst)
  const refillRate = rpm / 60_000 // tokens per millisecond

  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now }
  } else {
    const elapsed = now - bucket.lastRefill
    const refilled = elapsed * refillRate
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refilled)
    bucket.lastRefill = now
  }

  if (bucket.tokens < 1) {
    const needed = 1 - bucket.tokens
    const retryAfterSeconds = Math.ceil(needed / (refillRate * 1000))
    buckets.set(bucketKey, bucket)
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) }
  }

  bucket.tokens -= 1
  buckets.set(bucketKey, bucket)
  return { allowed: true }
}

const ipBuckets = new Map<string, Bucket>()

/** Per-IP limiter for public unauthenticated endpoints that have no client API config to look up. */
export function checkIpRateLimit(key: string, burst = 5): RateLimitResult {
  const now = Date.now()
  const rpm = burst * 6 // e.g. if burst is 5, allow 30 requests per minute sustained
  const maxTokens = burst
  const refillRate = rpm / 60_000 // tokens per millisecond

  let bucket = ipBuckets.get(key)
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now }
  } else {
    const elapsed = now - bucket.lastRefill
    const refilled = elapsed * refillRate
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refilled)
    bucket.lastRefill = now
  }

  if (bucket.tokens < 1) {
    const needed = 1 - bucket.tokens
    const retryAfterSeconds = Math.ceil(needed / (refillRate * 1000))
    ipBuckets.set(key, bucket)
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) }
  }

  bucket.tokens -= 1
  ipBuckets.set(key, bucket)
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
