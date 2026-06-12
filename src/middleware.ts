import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const SESSION_COOKIE = "session_token"
const PUBLIC_ROUTES = ["/"]

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some((r) => path === r)
  const token = req.cookies.get(SESSION_COOKIE)?.value

  if (!isPublicRoute && !token) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
