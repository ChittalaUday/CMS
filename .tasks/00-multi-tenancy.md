# Task: Multi-Tenant Client Architecture

**Priority:** Major / Foundation  
**Status:** TODO  
**Estimated effort:** 5–7 days  
**Must complete before:** All other tasks (this is a breaking schema change)

---

## Problem Statement

The CMS is currently single-tenant: all Users, Posts, Jobs, Media share a single flat namespace. There is no concept of a "client" or "project". All public API endpoints return data for every tenant with no authentication or isolation.

This task introduces **row-level multi-tenancy**: a `Client` model where each client has its own scoped users, content, and API keys. SUPER_ADMIN is the global owner. ADMIN/HR/EDITOR are sub-users belonging to exactly one client.

---

## Architecture Overview

```
SUPER_ADMIN (global, no clientId)
  │
  ├── creates/manages → Client A (e.g. "Acme Corp", domain: acme.com)
  │                       ├── API Keys  → used by Acme's public website
  │                       ├── ADMIN     → scoped to Client A
  │                       ├── HR        → scoped to Client A
  │                       └── EDITOR    → scoped to Client A
  │
  └── creates/manages → Client B (e.g. "TechStartup", domain: techstartup.io)
                          ├── API Keys  → used by TechStartup's website
                          ├── ADMIN     → scoped to Client B
                          └── EDITOR    → scoped to Client B

Public API:
  GET /api/public/blogs
  Headers: X-API-Key: cms_live_<key>    ← identifies the client, returns only their data
```

---

## Tenancy Model: Row-Level Isolation

Single database. Every data model gets a `clientId` FK. All queries are filtered by `clientId`. SUPER_ADMIN's own `clientId` is `null` — they operate globally. All other users have a non-null `clientId`.

---

## 1. Schema Changes

### New Models

```prisma
// prisma/schema.prisma

enum ClientStatus {
  ACTIVE
  SUSPENDED
  INACTIVE
}

model Client {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique       // used in dashboard URL, e.g. /dashboard/clients/acme-corp
  domain      String?                    // e.g. "acme.com" — used for CORS
  description String?
  logoUrl     String?
  status      ClientStatus @default(ACTIVE)
  createdById String?
  createdBy   User?        @relation("ClientCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  users       User[]       @relation("ClientUsers")
  posts       Post[]
  jobPostings JobPosting[]
  media       Media[]
  categories  Category[]
  apiKeys     ClientApiKey[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([slug])
  @@index([status])
}

model ClientApiKey {
  id          String    @id @default(cuid())
  clientId    String
  client      Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  name        String                   // "Production", "Staging", "Mobile App"
  keyHash     String    @unique        // SHA-256 hash of the actual key — never store plaintext
  keyPrefix   String                   // first 16 chars for display: "cms_live_a3f8..."
  scopes      String[]  @default(["read:blogs", "read:careers", "write:applications"])
  lastUsedAt  DateTime?
  expiresAt   DateTime?                // null = never expires
  revokedAt   DateTime?                // null = active
  createdById String?
  createdBy   User?     @relation("ApiKeyCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime  @default(now())

  @@index([clientId])
  @@index([keyHash])
}
```

### Modified Existing Models

Add `clientId` to these models (nullable to support migration):

```prisma
model User {
  // ... existing fields ...
  clientId    String?
  client      Client?  @relation("ClientUsers", fields: [clientId], references: [id], onDelete: SetNull)
  @@index([clientId])
}

model Post {
  // ... existing fields ...
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@index([clientId])
}

model JobPosting {
  // ... existing fields ...
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@index([clientId])
}

model Media {
  // ... existing fields ...
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id], onDelete: SetNull)
  @@index([clientId])
}

model Category {
  // ... existing fields ...
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@index([clientId])
}

model UserInvite {
  // ... existing fields ...
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

> **Note:** Keep `clientId` nullable in the migration. The data backfill step (see §3) assigns all existing rows to the "Default" client before you enforce NOT NULL in a second migration.

---

## 2. Session Changes

`getSession()` currently returns the user without `clientId`. Add it:

```ts
// src/lib/session.ts — update the select in prisma.session.findUnique

include: {
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
      clientId: true,   // ← ADD THIS
    },
  },
},
```

Every server action and server component that calls `getSession()` now has access to `session.clientId`.

---

## 3. Migration Strategy (Critical — Do Not Skip)

Multi-tenancy is a breaking schema change. Follow this exact sequence:

### Step 1 — Add nullable columns + new tables
```bash
npm run prisma:migrate   # migration: add_multitenancy_nullable
```
This adds `Client`, `ClientApiKey` tables and nullable `clientId` columns to all affected tables.

### Step 2 — Backfill existing data
Run a one-time seed script:

```ts
// prisma/migrations/backfill-default-client.ts
import { prisma } from '../src/lib/prisma'

async function backfill() {
  // Create the "Default" client
  const defaultClient = await prisma.client.upsert({
    where: { slug: 'default' },
    create: { name: 'Default', slug: 'default', status: 'ACTIVE' },
    update: {},
  })

  const id = defaultClient.id

  // Assign all existing data to the default client
  await prisma.post.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.jobPosting.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.media.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.category.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.userInvite.updateMany({ where: { clientId: null }, data: { clientId: id } })

  // Assign all non-SUPER_ADMIN users to the default client
  await prisma.user.updateMany({
    where: { clientId: null, role: { not: 'SUPER_ADMIN' } },
    data: { clientId: id },
  })

  console.log('Backfill complete. Default clientId:', id)
}

backfill()
```

Run: `npx tsx prisma/migrations/backfill-default-client.ts`

### Step 3 — Enforce NOT NULL (optional second migration)
After verifying backfill, add a second migration that makes `clientId NOT NULL` on `Post`, `JobPosting`, `Category`. Keep it nullable on `User` (SUPER_ADMIN has no client) and `Media` (media may be system-level).

---

## 4. Client Context Helper

Every server action needs to know "which client am I querying for?" Centralise this:

```ts
// src/lib/client-context.ts
import { getSession } from './session'
import { Role } from '@/generated/prisma/enums'

/**
 * Returns the clientId to scope DB queries to.
 * - SUPER_ADMIN: returns the overrideClientId if provided (from switcher cookie),
 *   otherwise returns null (global — queries all clients).
 * - All other roles: returns their own clientId (errors if missing).
 */
export async function getClientScope(overrideClientId?: string): Promise<string | null> {
  const session = await getSession()
  if (!session) throw new Error('Unauthenticated')

  if (session.role === Role.SUPER_ADMIN) {
    return overrideClientId ?? null  // null = no filter = see everything
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

---

## 5. Server Actions — Tenancy Filtering Pattern

Every server action that reads or writes data must be updated to filter by `clientId`.

### Example: `blogs/actions.ts`

```ts
// Before
const posts = await prisma.post.findMany({ where: { published: true } })

// After
import { getClientScope } from '@/lib/client-context'

const clientId = await getClientScope()
const where = clientId ? { published: true, clientId } : { published: true }
const posts = await prisma.post.findMany({ where })
```

```ts
// Before (create)
await prisma.post.create({ data: { ...postData, authorId: session.id } })

// After (create)
const clientId = await requireClientScope()
await prisma.post.create({ data: { ...postData, authorId: session.id, clientId } })
```

### Actions requiring updates:

| File | Change |
|---|---|
| `blogs/actions.ts` | Add `clientId` to all `findMany`, `findUnique`, `create`, `update` |
| `careers/actions.ts` | Same |
| `_actions/users.ts` | Scope user queries to `clientId`; pass `clientId` when creating users |
| `_actions/invites.ts` | Pass `clientId` when creating invites |
| `dashboard/media/` | Scope media queries |

---

## 6. Public API Authentication

### API Key Validation Helper

```ts
// src/lib/api-auth.ts
import { createHash } from 'crypto'
import { prisma } from './prisma'

export async function validateApiKey(request: Request): Promise<{
  clientId: string
  scopes: string[]
} | null> {
  // Accept key from header OR query param
  const header = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '')
  const url = new URL(request.url)
  const queryKey = url.searchParams.get('apiKey')
  const rawKey = header ?? queryKey

  if (!rawKey) return null

  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const apiKey = await prisma.clientApiKey.findUnique({
    where: { keyHash },
    select: {
      clientId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
    },
  })

  if (!apiKey) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  // Update lastUsedAt (fire-and-forget, don't await)
  prisma.clientApiKey.update({
    where: { keyHash },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return { clientId: apiKey.clientId, scopes: apiKey.scopes }
}
```

### Updated Public Routes

```ts
// src/app/api/public/blogs/route.ts

export async function GET(request: Request) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 })
  }
  if (!auth.scopes.includes('read:blogs')) {
    return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 })
  }

  const posts = await prisma.post.findMany({
    where: { published: true, clientId: auth.clientId },  // ← scoped
    // ... rest of select unchanged
  })
  // ...
}
```

Apply same pattern to:
- `GET /api/public/blogs/[slug]`
- `POST /api/public/blogs/view`
- `POST /api/public/careers/apply`
- Future: `GET /api/public/careers` (job listings)

### CORS per Client Domain

```ts
// In each public route handler, after validating the key:
const client = await prisma.client.findUnique({ where: { id: auth.clientId }, select: { domain: true } })
const origin = client?.domain ? `https://${client.domain}` : '*'

return new NextResponse(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
  },
})
```

---

## 7. API Key Generation

Keys are generated as: `cms_live_` + `randomBytes(32).toString('hex')` (total ~73 chars).

```ts
// src/app/dashboard/clients/actions.ts

export async function generateApiKey(clientId: string, name: string, expiresAt?: Date) {
  const session = await getSession()
  if (session?.role !== Role.SUPER_ADMIN) throw new Error('SUPER_ADMIN only')

  const rawKey = 'cms_live_' + randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 16) + '...'

  await prisma.clientApiKey.create({
    data: {
      clientId,
      name,
      keyHash,
      keyPrefix,
      expiresAt: expiresAt ?? null,
      createdById: session.id,
    },
  })

  // Return raw key ONCE — never retrievable again
  return { rawKey, keyPrefix }
}
```

The UI shows the raw key in a one-time modal with a copy button and a warning: "Store this key securely — it will not be shown again."

---

## 8. SUPER_ADMIN Client Switcher

SUPER_ADMIN can "act as" a specific client in the dashboard to manage their content directly. Store the active client in a cookie:

```ts
// Cookie: cms_active_client = <clientId>  (session-scoped, secure, httpOnly)
```

**Dashboard Layout** (`src/app/dashboard/layout.tsx`): 
- If the user is SUPER_ADMIN and `cms_active_client` cookie is set, pass that clientId as context.
- Show a sticky "Viewing as: [Client Name]" banner at the top of the dashboard with an "Exit" button that clears the cookie.
- When the cookie is absent, SUPER_ADMIN sees ALL data (no client filter).

A `ClientSwitcher` component (similar to existing `team-switcher.tsx`) appears in the sidebar for SUPER_ADMIN, listing all active clients.

---

## 9. New Dashboard Pages

### `/dashboard/clients` — Client Management (SUPER_ADMIN only)

```
src/app/dashboard/clients/
  page.tsx                         ← paginated list of all clients
  loading.tsx
  new/page.tsx                     ← create client form
  [id]/page.tsx                    ← client detail (overview + tabs)
  [id]/loading.tsx
  ClientsTableClient.tsx           ← table with status badges
  ClientForm.tsx                   ← create/edit form (name, slug, domain, description, logo)
  actions.ts                       ← createClient, updateClient, suspendClient, deleteClient
                                      generateApiKey, revokeApiKey, listApiKeys
```

### Client Detail Page Tabs

**Overview tab:**
- Stats: total users, published posts, open jobs, applications this month
- Client info: name, domain, status badge, created date

**Users tab:**
- Table of all users belonging to this client (ADMIN, HR, EDITOR)
- "Add User" button → reuses existing invite flow but pre-fills `clientId`
- Remove user from client

**API Keys tab:**
- List of all keys: name, prefix (e.g. `cms_live_a3f8...`), scopes, lastUsed, expires, status
- "Generate New Key" button → opens modal, shows raw key once
- "Revoke" button per key → sets `revokedAt`

**Settings tab:**
- Edit name, slug, domain, logo, description
- Danger zone: Suspend client (blocks API keys), Delete client (hard delete with confirmation)

---

## 10. `roles.ts` Additions

```ts
// src/lib/roles.ts — add:

/** SUPER_ADMIN is the only global role with no client scope. */
export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

/** Roles that can be assigned to a client's users. */
export const CLIENT_USER_ROLES = [Role.ADMIN, Role.HR, Role.EDITOR] as const

/** Check if a user belongs to a client (vs being a global SUPER_ADMIN). */
export function isClientUser(role: Role): boolean {
  return (CLIENT_USER_ROLES as readonly Role[]).includes(role)
}
```

---

## 11. `_actions/users.ts` Changes

When creating a user (ADMIN creating HR/EDITOR), the new user must inherit the admin's `clientId`:

```ts
// In createEditor action:
const sessionUser = await ensureAdmin()

// Non-SUPER_ADMIN must have a clientId to assign
const clientId = sessionUser.role === Role.SUPER_ADMIN
  ? data.clientId  // SUPER_ADMIN can specify which client
  : sessionUser.clientId  // ADMIN assigns to their own client

if (!clientId && sessionUser.role !== Role.SUPER_ADMIN) {
  throw new Error('Admin has no client assigned')
}

await prisma.user.create({
  data: {
    // ...existing fields...
    clientId: clientId ?? null,
  },
})
```

When ADMIN views users, they only see users from their own `clientId`:

```ts
const where: Prisma.UserWhereInput = {
  role: { in: [...manageableRoles] },
  ...(sessionUser.clientId ? { clientId: sessionUser.clientId } : {}),
}
```

---

## 12. Sidebar Changes (`app-sidebar.tsx`)

Add a "Clients" section visible only to SUPER_ADMIN:

```ts
// In nav items, gated by role:
if (session.role === Role.SUPER_ADMIN) {
  // Show "Clients" nav item with Building2 icon → /dashboard/clients
}
```

For SUPER_ADMIN while in client-switcher mode, show the active client banner (see §8).

---

## 13. Invite Flow Changes

When a user is invited, the invite URL must carry the `clientId` so the onboarding step assigns the correct client:

```ts
// UserInvite.clientId stores which client this user belongs to
// During invite acceptance (acceptInvite action), set user.clientId = invite.clientId
```

---

## 14. Files to Create

```
prisma/schema.prisma                                   ← Client, ClientApiKey + clientId on models
prisma/migrations/backfill-default-client.ts           ← one-time data backfill script

src/lib/api-auth.ts                                    ← validateApiKey()
src/lib/client-context.ts                              ← getClientScope(), requireClientScope()

src/app/dashboard/clients/page.tsx
src/app/dashboard/clients/loading.tsx
src/app/dashboard/clients/new/page.tsx
src/app/dashboard/clients/[id]/page.tsx
src/app/dashboard/clients/[id]/loading.tsx
src/app/dashboard/clients/ClientsTableClient.tsx
src/app/dashboard/clients/ClientForm.tsx
src/app/dashboard/clients/ApiKeyManager.tsx            ← key generation + revocation UI
src/app/dashboard/clients/ClientSwitcher.tsx           ← SUPER_ADMIN client switcher
src/app/dashboard/clients/actions.ts
```

## 15. Files to Modify

```
prisma/schema.prisma
src/lib/session.ts                                     ← include clientId in select
src/lib/roles.ts                                       ← add isSuperAdmin(), isClientUser()
src/lib/client-context.ts                              ← new file
src/lib/api-auth.ts                                    ← new file
src/app/_actions/users.ts                              ← scope to clientId
src/app/_actions/invites.ts                            ← pass clientId on accept
src/app/dashboard/blogs/actions.ts                     ← add clientId to all queries
src/app/dashboard/careers/actions.ts                   ← add clientId to all queries
src/app/api/public/blogs/route.ts                      ← require API key
src/app/api/public/blogs/[slug]/route.ts               ← require API key
src/app/api/public/blogs/view/route.ts                 ← require API key
src/app/api/public/careers/apply/route.ts              ← require API key
src/components/app-sidebar.tsx                         ← add Clients nav + client switcher
src/app/dashboard/layout.tsx                           ← read cms_active_client cookie for SA
```

---

## 16. Acceptance Criteria

### Schema & Migration
- [ ] `Client` and `ClientApiKey` models created and migrated
- [ ] `clientId` column added to `User`, `Post`, `JobPosting`, `Media`, `Category`, `UserInvite`
- [ ] Backfill script runs without error; all existing rows assigned to Default client
- [ ] SUPER_ADMIN users have `clientId = null`

### Public API Authentication
- [ ] All `/api/public/*` routes return `401` when no API key is provided
- [ ] Valid API key returns only the calling client's data
- [ ] Revoked or expired key returns `401`
- [ ] Key without required scope returns `403`
- [ ] `lastUsedAt` is updated on each valid request
- [ ] CORS `Access-Control-Allow-Origin` matches the client's `domain` field

### Client Management (SUPER_ADMIN)
- [ ] `/dashboard/clients` lists all clients with status, user count, post count
- [ ] SUPER_ADMIN can create a new client with name, slug, domain
- [ ] Client detail shows accurate stats per client
- [ ] SUPER_ADMIN can suspend a client (disables all its API keys)
- [ ] SUPER_ADMIN can delete a client (cascades to posts, jobs, users)

### API Key Management
- [ ] SUPER_ADMIN can generate a new API key for a client
- [ ] Raw key is shown exactly once in a copy-to-clipboard modal
- [ ] Key list shows prefix, name, scopes, lastUsed, expiry, status
- [ ] Revoking a key immediately invalidates it (next API call returns 401)

### User Scoping
- [ ] ADMIN creating a user assigns them to the same `clientId`
- [ ] ADMIN can only see users from their own client in `/dashboard/users`
- [ ] SUPER_ADMIN sees users filtered by the currently switched client (if active)

### Client Switcher
- [ ] SUPER_ADMIN sees all clients in sidebar switcher
- [ ] Selecting a client shows a "Viewing as: [Name]" banner
- [ ] All queries are scoped to the active client while switcher is active
- [ ] "Exit" clears the switcher cookie and returns to global view

### Data Isolation
- [ ] No query leaks data across clients (verified by creating two test clients)
- [ ] Blog, careers, media, and category queries all respect `clientId`
- [ ] Invite acceptance sets `user.clientId` from `invite.clientId`
