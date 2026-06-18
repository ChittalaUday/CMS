# Sub-task 00-05 — Client Management Dashboard

**Status:** TODO  
**Effort:** ~1.5 days  
**Depends on:** 00-02  
**Blocks:** 00-06, 00-07

---

## Goal

Build the `/dashboard/clients` section — SUPER_ADMIN only. Includes a paginated client list, a create/edit form, and a detail page with four tabs: Overview, Users, API Keys, Settings.

---

## Files to Create

```
src/app/dashboard/clients/
  page.tsx                      ← paginated client list
  loading.tsx                   ← skeleton
  new/page.tsx                  ← create form page
  [id]/page.tsx                 ← client detail (tabs)
  [id]/loading.tsx
  ClientsTableClient.tsx        ← table with status badges + action menu
  ClientForm.tsx                ← create/edit form (name, slug, domain, logo, description)
  actions.ts                    ← all server actions for client CRUD
```

---

## `actions.ts`

```ts
'use server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Role } from '@/generated/prisma/enums'
import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'

// createClient
// updateClient
// suspendClient   — sets status = SUSPENDED
// deleteClient    — hard delete, cascades via Prisma onDelete: Cascade
// generateApiKey  — returns rawKey ONCE (see 00-06)
// revokeApiKey    — sets revokedAt = now()
// listApiKeys     — returns prefix, name, scopes, lastUsed, expiry, status
```

All actions must check `session.role === Role.SUPER_ADMIN` and throw otherwise.

---

## `page.tsx` — Client List

- Paginated table: name, slug, domain, status badge, user count, post count, created date
- "New Client" button → `/dashboard/clients/new`
- Each row links to `/dashboard/clients/[id]`
- Filter by status (ACTIVE / SUSPENDED / INACTIVE)

## `ClientsTableClient.tsx`

Client-side table component.
- Status badge: `ACTIVE` = green, `SUSPENDED` = yellow, `INACTIVE` = gray
- Actions menu per row: View, Edit, Suspend/Activate, Delete (AlertDialog confirmation)

## `ClientForm.tsx`

Fields:
- Name (required)
- Slug (required, auto-generated from name, validated unique)
- Domain (optional, e.g. `acme.com`)
- Description (optional)
- Logo URL (optional)

## `[id]/page.tsx` — Client Detail Tabs

Use shadcn `Tabs` component. Four tabs:

### Overview tab
- Stats cards: total users, published posts, open jobs, applications this month
- Client info: name, slug, domain, status badge, created date, created by

### Users tab
- Table of users belonging to this client (ADMIN, HR, EDITOR)
- Role badge per user
- "Invite User" button → reuses existing invite flow with `clientId` pre-filled
- "Remove" button per user → sets `user.clientId = null` (AlertDialog confirmation)

### API Keys tab
- See sub-task [00-06](./00-06-api-key-ui.md)

### Settings tab
- Edit form (same as ClientForm, pre-filled)
- Danger zone:
  - Suspend Client button (sets status = SUSPENDED, disables all API keys)
  - Delete Client button (AlertDialog: "This will permanently delete all data for this client")

---

## Route Guard

Add `/dashboard/clients` to the SUPER_ADMIN-only route set. In `page.tsx`:

```ts
const session = await getSession()
if (session?.role !== Role.SUPER_ADMIN) redirect('/dashboard')
```

---

## Acceptance Criteria

- [ ] `/dashboard/clients` lists all clients with status, user count, post count
- [ ] Non-SUPER_ADMIN is redirected away from `/dashboard/clients`
- [ ] SUPER_ADMIN can create a new client
- [ ] SUPER_ADMIN can edit client details (name, domain, description, logo)
- [ ] SUPER_ADMIN can suspend / re-activate a client
- [ ] SUPER_ADMIN can delete a client (with confirmation dialog)
- [ ] Client detail shows accurate per-client stats
- [ ] Users tab lists client users with role badges
- [ ] "Invite User" pre-fills `clientId`
- [ ] "Remove user from client" clears `clientId`
