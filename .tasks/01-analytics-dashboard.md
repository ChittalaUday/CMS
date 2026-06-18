# Task: Analytics Dashboard

**Priority:** Tier 1  
**Status:** TODO  
**Estimated effort:** 1–2 days

---

## Goal

Build a `/dashboard/analytics` page that surfaces the data already stored in the `View`, `Like`, `Post`, `JobPosting`, and `JobApplication` models. No new DB models needed — pure read queries.

---

## Screens / Sections

### 1. Blog Analytics
- Top 10 posts by views (last 7 / 30 / 90 days — segmented control)
- Top 10 posts by likes
- Total views and likes over time (line or bar chart)
- Views per day for the last 30 days (area chart)

### 2. Careers Analytics
- Applications per job posting (bar chart)
- Application funnel per job: NEW → REVIEWING → SHORTLISTED → HIRED (horizontal funnel or stacked bar)
- Applications over time (last 30 days)
- Average ATS score per job posting

### 3. Summary Cards (top of page)
- Total published posts
- Total views (all time)
- Total open job postings
- Total applications (last 30 days)

---

## Files to Create

```
src/app/dashboard/analytics/
  page.tsx               ← server component, fetches all aggregate data
  loading.tsx            ← skeleton placeholders
  AnalyticsSummary.tsx   ← 4 summary stat cards
  BlogAnalytics.tsx      ← blog charts section
  CareersAnalytics.tsx   ← careers funnel + charts
```

---

## Implementation Notes

- Use Recharts (or shadcn Charts which wraps Recharts) — already in the project via shadcn. Run `npx shadcn add chart` if the chart component is not installed.
- All queries run in the Server Component `page.tsx` via `prisma` directly (no server actions needed — read-only).
- Time-range filtering (7d / 30d / 90d) can use a Client Component wrapper with `useRouter` + searchParam, or a simple Suspense boundary per section.
- Follow mobile-first layout: cards stack on mobile, 2-col grid on `md:`, 4-col on `lg:`.
- Add the route to `app-sidebar.tsx` under a new "Analytics" nav item visible to ADMIN and SUPER_ADMIN only (use `canAccessBlogs` or a new `isAdmin` guard from `src/lib/roles.ts`).

---

## Key Prisma Queries

```ts
// Views per day (last 30 days)
prisma.view.groupBy({
  by: ['createdAt'],
  _count: { id: true },
  where: { createdAt: { gte: subDays(new Date(), 30) } },
  orderBy: { createdAt: 'asc' },
})

// Top posts by views
prisma.post.findMany({
  where: { publishedAt: { not: null } },
  select: { id: true, title: true, slug: true, _count: { select: { views: true, likes: true } } },
  orderBy: { views: { _count: 'desc' } },
  take: 10,
})

// Application funnel per job
prisma.jobApplication.groupBy({
  by: ['jobId', 'status'],
  _count: { id: true },
})
```

---

## Acceptance Criteria

- [ ] Page loads without error for all roles (ADMIN, SUPER_ADMIN see it; EDITOR/HR do not see the nav item)
- [ ] Summary cards show correct totals
- [ ] Blog chart renders top posts sorted by views
- [ ] Careers funnel shows status breakdown per job
- [ ] Page has loading skeleton
- [ ] Mobile layout is usable (no horizontal overflow)
