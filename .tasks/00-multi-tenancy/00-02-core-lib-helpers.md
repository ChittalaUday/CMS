# Sub-task 00-02 — Core Library Helpers

**Status:** TODO  
**Effort:** ~0.5 day  
**Depends on:** 00-01 (schema must be migrated)  
**Blocks:** 00-03, 00-04, 00-05

---

## Goal

Create the shared helpers that every server action will use to scope DB queries to the right client. Also update `session.ts` so the session carries `clientId`, and add helpers to `roles.ts`.

---

## Files to Create

### `src/lib/client-context.ts`

```ts
import { getSession } from './session'
import { Role } from '@/generated/prisma/enums'

/**
 * Returns the clientId to scope DB queries to.
 * - SUPER_ADMIN: returns overrideClientId (from switcher cookie) or null (global view).
 * - All other roles: returns their own clientId, throws if missing.
 */
export async function getClientScope(overrideClientId?: string): Promise<string | null> {
  const session = await getSession()
  if (!session) throw new Error('Unauthenticated')

  if (session.role === Role.SUPER_ADMIN) {
    return overrideClientId ?? null
  }

  if (!session.clientId) throw new Error('User has no client assigned')
  return session.clientId
}

/**
 * Like getClientScope but throws if the scope is null.
 * Use in actions that MUST be scoped to a single client.
 */
export async function requireClientScope(overrideClientId?: string): Promise<string> {
  const scope = await getClientScope(overrideClientId)
  if (!scope) throw new Error('No client scope — provide a clientId')
  return scope
}
```

### `src/lib/api-auth.ts`

```ts
import { createHash } from 'crypto'
import { prisma } from './prisma'

export async function validateApiKey(request: Request): Promise<{
  clientId: string
  scopes: string[]
} | null> {
  const header = request.headers.get('x-api-key')
    ?? request.headers.get('authorization')?.replace('Bearer ', '')
  const queryKey = new URL(request.url).searchParams.get('apiKey')
  const rawKey = header ?? queryKey

  if (!rawKey) return null

  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const apiKey = await prisma.clientApiKey.findUnique({
    where: { keyHash },
    select: { clientId: true, scopes: true, revokedAt: true, expiresAt: true },
  })

  if (!apiKey) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  // fire-and-forget
  prisma.clientApiKey.update({
    where: { keyHash },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return { clientId: apiKey.clientId, scopes: apiKey.scopes }
}
```

---

## Files to Modify

### `src/lib/session.ts`

In the `prisma.session.findUnique` select, add `clientId: true` to the user select block:

```ts
user: {
  select: {
    id: true,
    email: true,
    username: true,
    name: true,
    bio: true,
    role: true,
    avatarUrl: true,
    onboardingCompleted: true,
    clientId: true,   // ← ADD
  },
},
```

### `src/lib/roles.ts`

Add at the bottom:

```ts
export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

export const CLIENT_USER_ROLES = [Role.ADMIN, Role.HR, Role.EDITOR] as const

export function isClientUser(role: Role): boolean {
  return (CLIENT_USER_ROLES as readonly Role[]).includes(role)
}
```

---

## Acceptance Criteria

- [ ] `getSession()` returns `clientId` on the session user object
- [ ] `getClientScope()` returns `null` for SUPER_ADMIN (no override), `clientId` for others
- [ ] `requireClientScope()` throws when scope is null
- [ ] `validateApiKey()` returns `null` for missing/revoked/expired keys, `{ clientId, scopes }` for valid ones
- [ ] `isSuperAdmin()` and `isClientUser()` work correctly
- [ ] TypeScript compiles without errors
