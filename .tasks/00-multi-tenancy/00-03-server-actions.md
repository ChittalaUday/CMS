# Sub-task 00-03 — Server Actions — Tenancy Filtering

**Status:** TODO  
**Effort:** ~1 day  
**Depends on:** 00-02  
**Blocks:** nothing (can run in parallel with 00-04)

---

## Goal

Update every dashboard server action that reads or writes data to filter by `clientId`. Uses `getClientScope()` / `requireClientScope()` from `src/lib/client-context.ts`.

---

## Pattern

```ts
// BEFORE — no tenant scope
const posts = await prisma.post.findMany({ where: { published: true } })

// AFTER — scoped
import { getClientScope, requireClientScope } from '@/lib/client-context'

// reads: null = SUPER_ADMIN sees all
const clientId = await getClientScope()
const where = clientId ? { published: true, clientId } : { published: true }
const posts = await prisma.post.findMany({ where })

// creates: always requires a scope
const clientId = await requireClientScope()
await prisma.post.create({ data: { ...postData, clientId } })
```

---

## Files to Update

### `src/app/dashboard/blogs/actions.ts`

- `getPosts` / `getPost` — add `clientId` to `findMany` / `findUnique` where clause
- `createPost` — pass `clientId` on create
- `updatePost` — ensure the post belongs to the caller's client before updating
- `deletePost` — same ownership check

### `src/app/dashboard/careers/actions.ts`

- `getJobPostings` — scope by `clientId`
- `createJobPosting` — pass `clientId`
- `updateJobPosting` — ownership check
- `deleteJobPosting` — ownership check
- `getApplications` — scope by job's `clientId`

### `src/app/_actions/users.ts`

- `getUsers` — ADMIN sees only users from own `clientId`
- `createUser` / `inviteUser` — inherit `clientId` from session user (SUPER_ADMIN can specify)
- `deleteUser` — ownership check

```ts
const sessionUser = await ensureAdmin()

const clientId = sessionUser.role === Role.SUPER_ADMIN
  ? data.clientId
  : sessionUser.clientId

if (!clientId && sessionUser.role !== Role.SUPER_ADMIN) {
  throw new Error('Admin has no client assigned')
}

// getUsers where clause:
const where: Prisma.UserWhereInput = {
  role: { in: [...manageableRoles] },
  ...(sessionUser.clientId ? { clientId: sessionUser.clientId } : {}),
}
```

### `src/app/_actions/invites.ts`

- `createInvite` — store `clientId` on the invite record
- `acceptInvite` — set `user.clientId = invite.clientId` during acceptance

### `src/app/dashboard/media/` (actions or route handlers)

- Scope media queries to `clientId`
- Pass `clientId` when creating Media records

---

## Acceptance Criteria

- [ ] ADMIN can only see posts/jobs/users from their own `clientId`
- [ ] Creating a post/job always sets `clientId`
- [ ] Update/delete checks the record belongs to caller's client
- [ ] Invite acceptance copies `clientId` from invite to new user
- [ ] SUPER_ADMIN (no switcher active) sees all data across clients
- [ ] TypeScript compiles without errors
