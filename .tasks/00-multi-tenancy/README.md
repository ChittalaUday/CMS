# Task 00 — Multi-Tenant Client Architecture

**Parent task:** [00-multi-tenancy.md](../00-multi-tenancy.md)  
**Total estimated effort:** 5–7 days  
**Status:** TODO  
**Build order:** All other tasks depend on this being complete first.

---

## Sub-tasks

| # | Sub-task | Effort | Depends On | Status |
|---|----------|--------|------------|--------|
| 00-01 | [Schema & Migration](./00-01-schema-migration.md) | 0.5 day | — | TODO |
| 00-02 | [Core Library Helpers](./00-02-core-lib-helpers.md) | 0.5 day | 00-01 | TODO |
| 00-03 | [Server Actions — Tenancy Filtering](./00-03-server-actions.md) | 1 day | 00-02 | TODO |
| 00-04 | [Public API Authentication](./00-04-public-api-auth.md) | 1 day | 00-02 | TODO |
| 00-05 | [Client Management Dashboard](./00-05-client-dashboard.md) | 1.5 days | 00-02 | TODO |
| 00-06 | [API Key Management UI](./00-06-api-key-ui.md) | 0.5 day | 00-05 | TODO |
| 00-07 | [SUPER_ADMIN Client Switcher](./00-07-client-switcher.md) | 0.5 day | 00-05 | TODO |
| 00-08 | [Sidebar & Navigation](./00-08-sidebar-nav.md) | 0.5 day | 00-07 | TODO |

---

## Build Order

```
00-01 Schema & Migration
  └── 00-02 Core Library Helpers
        ├── 00-03 Server Actions (can start alongside 00-04)
        ├── 00-04 Public API Auth (can start alongside 00-03)
        └── 00-05 Client Dashboard
              ├── 00-06 API Key UI
              └── 00-07 Client Switcher
                    └── 00-08 Sidebar & Nav
```

---

## Acceptance Criteria (summary)

- `Client` + `ClientApiKey` tables created; all data models carry `clientId`
- All existing rows backfilled to "Default" client
- `/api/public/*` routes require a valid API key and return only scoped data
- SUPER_ADMIN can create clients, manage API keys, and switch client context
- ADMIN/HR/EDITOR only see data from their own `clientId`
- No query leaks data across clients
