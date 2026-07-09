import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "session_token"

// In-memory rate limiter (per-worker process).
// For multi-instance production deployments, swap this out for Vercel KV.
const _rl = new Map<string, { n: number; reset: number }>()

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = _rl.get(key)
  if (!entry || entry.reset < now) {
    _rl.set(key, { n: 1, reset: now + windowMs })
    return true
  }
  if (entry.n >= max) return false
  entry.n++
  return true
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicApi = path.startsWith("/api/public/")
  const isUploadThing = path.startsWith("/api/uploadthing")

  // Block TRACE to prevent Cross-Site Tracing (XST)
  if (req.method === "TRACE") {
    return new NextResponse(null, {
      status: 405,
      headers: { Allow: "GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS" },
    })
  }

  // CORS preflight for public API routes
  if (req.method === "OPTIONS" && isPublicApi) {
    const response = new NextResponse(null, { status: 204 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
    return response
  }

  // 1. CSRF: require Origin on all state-changing non-public requests.
  //    UploadThing webhook callbacks are exempt (they use their own signature verification).
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method) && !isPublicApi && !isUploadThing) {
    const origin = req.headers.get("origin")
    const host = req.headers.get("host")

    if (!origin) {
      return new NextResponse("CSRF Violation: Missing Origin header.", { status: 403 })
    }

    if (host) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return new NextResponse("CSRF Violation: Request origin does not match host.", { status: 403 })
        }
      } catch {
        return new NextResponse("CSRF Violation: Invalid origin header.", { status: 400 })
      }
    }
  }

  // 2. Rate limit login attempts.
  //    Next.js server actions POST to the page URL with a Next-Action header.
  if (req.method === "POST" && path === "/" && req.headers.has("next-action")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
    if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many attempts. Try again in a minute." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      )
    }
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value

  const PUBLIC_PREFIXES = [
    "/invite",
    "/careers/",
    "/api/public/",
    "/api/health",
    "/robots.txt",
    "/sitemap.xml",
    "/.well-known/",
  ]
  const isLoginPage = path === "/"
  const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

  let res: NextResponse

  if (!isLoginPage && !isPublicPrefix && !token) {
    res = NextResponse.redirect(new URL("/", req.nextUrl))
  } else if (isLoginPage && token) {
    res = NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  } else {
    res = NextResponse.next()
  }

  // CORS response headers for public API
  if (isPublicApi) {
    res.headers.set("Access-Control-Allow-Origin", "*")
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
  }

  // 3. Security headers
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-XSS-Protection", "1; mode=block")
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol
  const isSecureConnection = proto.startsWith("https")
  if (isSecureConnection) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  }
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")

  const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
  let r2Origin = ""
  if (r2PublicUrl) {
    try {
      r2Origin = new URL(r2PublicUrl).origin
    } catch {}
  }

  // unsafe-eval only in development (required by Turbopack HMR); removed in production
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'"

  const imgSrc = ["'self'", "data:", "blob:", "https://avatar.iran.liara.run", r2Origin]
    .filter(Boolean)
    .join(" ")

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSrc}`,
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ") + ";"
  )

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
