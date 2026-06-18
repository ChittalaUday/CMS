/**
 * Central authority for role-based access control.
 * Import Role from the Prisma enums (pure const — safe for client + server).
 * All multi-role checks use array .includes() — no string-literal comparisons.
 */
import { Role } from "@/generated/prisma/enums"

export { Role }

// ── Role groups ─────────────────────────────────────────────────────────────

/** Full admin access — manage users, all content, and all features. */
export const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.ADMIN] as const

/** Roles that can create/edit blog content. */
export const BLOG_ACCESS_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR] as const

/** Roles that can access careers management. */
export const CAREERS_ACCESS_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR] as const

/** Roles that can delete job postings and perform destructive careers actions. */
export const CAREERS_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.ADMIN] as const

/** Roles that user management UI may create/edit. */
export const MANAGEABLE_BY_SUPER_ADMIN = [Role.ADMIN, Role.HR, Role.EDITOR, Role.DEVELOPER] as const
export const MANAGEABLE_BY_ADMIN = [Role.HR, Role.EDITOR, Role.DEVELOPER] as const

/** DEVELOPER: read-only API docs access only — no CMS content access. */
export const DEVELOPER_ROLES = [Role.DEVELOPER] as const

// ── Predicate helpers ────────────────────────────────────────────────────────

export function isAdmin(role: Role): boolean {
  return (ADMIN_ROLES as readonly Role[]).includes(role)
}

export function canAccessBlogs(role: Role): boolean {
  return (BLOG_ACCESS_ROLES as readonly Role[]).includes(role)
}

export function canAccessCareers(role: Role): boolean {
  return (CAREERS_ACCESS_ROLES as readonly Role[]).includes(role)
}

export function canDeleteJobPostings(role: Role): boolean {
  return (CAREERS_ADMIN_ROLES as readonly Role[]).includes(role)
}

export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

export function isDeveloper(role: Role): boolean {
  return role === Role.DEVELOPER
}

export const CLIENT_USER_ROLES = [Role.ADMIN, Role.HR, Role.EDITOR, Role.DEVELOPER] as const

export function isClientUser(role: Role): boolean {
  return (CLIENT_USER_ROLES as readonly Role[]).includes(role)
}
