import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "session_token"
const PUBLIC_ROUTES = ["/"]

export default async function proxy(req: NextRequest) {
  // 1. CSRF Protection for state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.headers.get("origin")
    const host = req.headers.get("host")
    if (origin && host) {
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

  const path = req.nextUrl.pathname
  const token = req.cookies.get(SESSION_COOKIE)?.value

  // Paths publicly accessible without a session
  const PUBLIC_PREFIXES = ["/invite", "/careers/"]
  const isLoginPage = path === "/"
  const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

  let res: NextResponse

  if (!isLoginPage && !isPublicPrefix && !token) {
    // Protected route — no session → send to login
    res = NextResponse.redirect(new URL("/", req.nextUrl))
  } else if (isLoginPage && token) {
    // Already logged in — skip login page
    res = NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  } else {
    res = NextResponse.next()
  }

  // 2. Security Headers (CSRF / XSS / Framing protection)
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-XSS-Protection", "1; mode=block")

  const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
  let r2Origin = ""
  if (r2PublicUrl) {
    try {
      r2Origin = new URL(r2PublicUrl).origin
    } catch {}
  }

  res.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://avatar.iran.liara.run https://*.r2.dev ${r2Origin}`.trim() + "; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
  )

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
