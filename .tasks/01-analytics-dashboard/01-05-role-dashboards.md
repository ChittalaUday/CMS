# 01-05 — Role-Based Dashboard Page + Widget Composition

**Parent:** [01 Analytics Dashboard](../01-analytics-dashboard.md)  
**Status:** TODO  
**Effort:** 0.5 days  
**Linear:** UDA-61  
**Depends on:** 01-01, 01-02, 01-03, 01-04

---

## Goal

Replace the current placeholder `src/app/dashboard/page.tsx` with a fully role-aware server component that:
1. Reads the session to determine role
2. Fetches only the data that role needs (no over-fetching)
3. Renders the correct set of widgets in the correct grid positions

---

## Widget Layout per Role

### SUPER_ADMIN & ADMIN
```
[ TotalPosts:sm ][ TotalViews:sm ][ OpenJobs:sm ][ NewApplications:sm ]
[ BlogViewsChart:lg                ][ TopPosts:md               ]
[ BlogEngagement:md    ][ ApplicationFunnel:lg             ]
[ ApplicationsPerJob:md ][ ATSScore:md ]
[ ApplicationsTimeline:full                                          ]
```

### HR
```
[ OpenJobs:sm ][ NewApplications:sm ]
[ ApplicationFunnel:lg             ][ ApplicationsPerJob:md ]
[ ATSScore:md ][ ApplicationsTimeline:full                  ]
```

### EDITOR
```
[ TotalPosts:sm ][ TotalViews:sm ]
[ BlogViewsChart:full                                                ]
[ TopPosts:full                                                      ]
```

---

## Implementation

### `src/app/dashboard/page.tsx`

Server component. Logic:

```ts
const user = await getSession()
const days = Number(searchParams.days ?? 30)
const clientId = resolveClientId(user)   // from cookie for SUPER_ADMIN, user.clientId for others

// Conditional data fetching based on role
const [blogStats, careersStats] = await Promise.all([
  canAccessBlogs(user.role) ? fetchBlogStats({ clientId, days, userId: isEditor ? user.id : undefined }) : null,
  canAccessCareers(user.role) ? fetchCareersStats({ clientId, days }) : null,
])
```

### `src/app/dashboard/loading.tsx`

Skeleton grid that mirrors the ADMIN layout (most widgets) so the loading state doesn't shift when data loads. Uses `WidgetCard loading` + `Skeleton` components.

---

## Widget Registry Pattern

Define widget configs as an array per role — each entry is `{ id, size, component }`.  
The `WidgetGrid` maps over the array and renders each widget, preserving order and span.

```ts
// dashboard-config.ts
const SUPER_ADMIN_WIDGETS = [
  { id: 'stat-posts', size: 'sm' as const },
  { id: 'stat-views', size: 'sm' as const },
  // ...
]
```

This makes it trivial to add/remove/reorder widgets per role without touching layout code.

---

## Files

```
src/app/dashboard/
  page.tsx                          ← replace entirely
  loading.tsx                       ← replace entirely
  _widgets/dashboard-config.ts     ← widget arrays per role
```

---

## Acceptance Criteria

- [ ] SUPER_ADMIN sees all stat cards + blog + careers widgets
- [ ] ADMIN sees same as SUPER_ADMIN but data scoped to their client
- [ ] HR sees only careers stat cards + careers widgets
- [ ] EDITOR sees only blog stat cards + blog widgets + their own posts only
- [ ] `loading.tsx` shows a skeleton grid (not a spinner)
- [ ] Adding a new widget to a role's config automatically appears in the grid
- [ ] No `any` types — all data passed as typed props
