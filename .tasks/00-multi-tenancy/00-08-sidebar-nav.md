# Sub-task 00-08 — Sidebar & Navigation

**Status:** TODO  
**Effort:** ~0.5 day  
**Depends on:** 00-07 (client switcher component exists)  
**Blocks:** nothing (final sub-task)

---

## Goal

Wire the ClientSwitcher and "Clients" nav link into the sidebar, gated to SUPER_ADMIN only.

---

## File to Modify

```
src/components/app-sidebar.tsx
```

---

## Changes

### 1. Add "Clients" nav item (SUPER_ADMIN only)

Find the nav items array in `app-sidebar.tsx` and add a "Clients" entry, gated by role:

```ts
import { Building2 } from 'lucide-react'

// In the nav items section, conditionally include:
...(session.role === Role.SUPER_ADMIN
  ? [{
      title: 'Clients',
      url: '/dashboard/clients',
      icon: Building2,
    }]
  : [])
```

Place it near the top of the nav (after Dashboard overview, before Blogs) since it's a global admin tool.

### 2. Add ClientSwitcher to sidebar

Import and render `ClientSwitcher` in the sidebar, visible only to SUPER_ADMIN:

```tsx
import { ClientSwitcher } from '@/app/dashboard/clients/ClientSwitcher'

// In sidebar JSX, near the top (or in a dedicated "workspace" section):
{session.role === Role.SUPER_ADMIN && (
  <ClientSwitcher />
)}
```

The `ClientSwitcher` renders a dropdown/combobox similar to the existing team-switcher pattern with the list of active clients.

---

## Visual Placement

```
Sidebar layout (SUPER_ADMIN):
┌─────────────────────────────┐
│  [ClientSwitcher dropdown]  │  ← new: "All Clients" or "Acme Corp ▼"
├─────────────────────────────┤
│  📊 Dashboard               │
│  🏢 Clients          ← new  │
│  📝 Blog                    │
│  💼 Careers                 │
│  🖼 Media                   │
│  👥 Users                   │
└─────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] "Clients" nav item appears in sidebar for SUPER_ADMIN only
- [ ] "Clients" nav item links to `/dashboard/clients`
- [ ] `ClientSwitcher` appears in sidebar for SUPER_ADMIN only
- [ ] Active client name shown in switcher when one is selected
- [ ] Non-SUPER_ADMIN users see no trace of clients nav or switcher
- [ ] Active nav item (`/dashboard/clients`) receives correct active styling
