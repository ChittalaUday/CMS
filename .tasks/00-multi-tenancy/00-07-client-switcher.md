# Sub-task 00-07 — SUPER_ADMIN Client Switcher

**Status:** TODO  
**Effort:** ~0.5 day  
**Depends on:** 00-05 (clients exist in DB)  
**Blocks:** 00-08

---

## Goal

Let SUPER_ADMIN "act as" a specific client in the dashboard. The active client is stored in a cookie (`cms_active_client`). While active, all queries are scoped to that client and a banner is shown at the top of the dashboard.

---

## Cookie

```
Name:     cms_active_client
Value:    <clientId>
Scope:    session (no maxAge)
Flags:    httpOnly, secure, sameSite=lax, path=/dashboard
```

---

## File to Create

```
src/app/dashboard/clients/ClientSwitcher.tsx
```

A client component (similar to `team-switcher.tsx`) that:
- Appears in the sidebar, visible only to SUPER_ADMIN
- Lists all ACTIVE clients in a dropdown/popover
- "All Clients" option at the top (clears cookie → global view)
- Selecting a client sets the cookie via a server action and triggers a router refresh

```ts
// Server action to set/clear the switcher cookie
'use server'
import { cookies } from 'next/headers'

export async function setActivClient(clientId: string | null) {
  const jar = await cookies()
  if (clientId) {
    jar.set('cms_active_client', clientId, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/dashboard',
    })
  } else {
    jar.delete('cms_active_client')
  }
}
```

---

## Dashboard Layout Changes (`src/app/dashboard/layout.tsx`)

Read the cookie and pass context down:

```ts
import { cookies } from 'next/headers'

// Inside layout:
const jar = await cookies()
const activeClientId = jar.get('cms_active_client')?.value ?? null

// If SUPER_ADMIN has a switcher active, fetch the client name for the banner:
let activeClientName: string | null = null
if (session.role === Role.SUPER_ADMIN && activeClientId) {
  const client = await prisma.client.findUnique({
    where: { id: activeClientId },
    select: { name: true },
  })
  activeClientName = client?.name ?? null
}
```

Pass `activeClientId` and `activeClientName` as props (or via a server-side context pattern) to:
1. The "Viewing as" banner
2. `getClientScope()` calls in server actions (via request context or passed explicitly)

---

## "Viewing As" Banner

Show at the top of the dashboard content area when `activeClientName` is set:

```tsx
{activeClientName && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
    <span className="text-amber-800">
      Viewing as: <strong>{activeClientName}</strong>
    </span>
    <form action={clearActiveClientAction}>
      <button type="submit" className="text-amber-600 hover:text-amber-900 underline">
        Exit
      </button>
    </form>
  </div>
)}
```

---

## `getClientScope()` Integration

Update `getClientScope()` in `client-context.ts` to read the cookie for SUPER_ADMIN:

```ts
import { cookies } from 'next/headers'

export async function getClientScope(): Promise<string | null> {
  const session = await getSession()
  if (!session) throw new Error('Unauthenticated')

  if (session.role === Role.SUPER_ADMIN) {
    const jar = await cookies()
    return jar.get('cms_active_client')?.value ?? null
  }

  if (!session.clientId) throw new Error('User has no client assigned')
  return session.clientId
}
```

(Remove the `overrideClientId` parameter if it's no longer needed externally.)

---

## Acceptance Criteria

- [ ] SUPER_ADMIN sees ClientSwitcher in the sidebar
- [ ] Selecting a client sets the cookie and triggers dashboard refresh
- [ ] "Viewing as: [Client Name]" banner appears when a client is active
- [ ] All dashboard queries (blogs, careers, users, media) are scoped to the active client
- [ ] "Exit" button clears the cookie and returns to global view (all clients visible)
- [ ] Non-SUPER_ADMIN users never see the switcher or banner
