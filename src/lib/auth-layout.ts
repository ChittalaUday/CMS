import "server-only"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import type { Role } from "@/lib/roles"

/**
 * Shared gate for layout.tsx files.
 * Checks session and enforces role membership.
 * Call at the top of every protected layout — never in individual pages.
 */
export async function requireRole(
  allowedRoles: readonly Role[],
  redirectTo = "/dashboard"
) {
  const user = await getSession()
  if (!user) redirect("/")
  if (!(allowedRoles as Role[]).includes(user.role)) redirect(redirectTo)
  return user
}

/** Any authenticated user — for sections open to all logged-in roles. */
export async function requireAuth() {
  const user = await getSession()
  if (!user) redirect("/")
  return user
}
