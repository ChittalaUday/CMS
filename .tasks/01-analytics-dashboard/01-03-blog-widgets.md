# 01-03 — Blog Analytics Widgets

**Parent:** [01 Analytics Dashboard](../01-analytics-dashboard.md)  
**Status:** TODO  
**Effort:** 0.5 days  
**Linear:** UDA-59  
**Depends on:** 01-01, 01-02

---

## Goal

Build three blog-specific analytics widgets. Visible to SUPER_ADMIN, ADMIN, and EDITOR. EDITOR sees only their own posts; ADMIN/SUPER_ADMIN see all posts (scoped to their client).

---

## Widgets

### 1. `BlogViewsChartWidget.tsx` — size: `lg`

Area chart: views per day for the last N days (N driven by time-range filter).  
X-axis: date labels. Y-axis: view count. Uses shadcn `<Chart>` (Recharts wrapper).

**Prisma query:**
```ts
prisma.view.groupBy({
  by: ['createdAt'],
  _count: { id: true },
  where: {
    createdAt: { gte: subDays(new Date(), days) },
    post: { clientId }         // scoped to active client
  },
  orderBy: { createdAt: 'asc' },
})
```

### 2. `TopPostsWidget.tsx` — size: `md`

Table of top 10 posts by views. Columns: Title (truncated), Views, Likes, Published date.  
On mobile: Title + Views only (hide Likes + date with `hidden sm:table-cell`).

**Prisma query:**
```ts
prisma.post.findMany({
  where: { publishedAt: { not: null }, clientId },
  select: {
    id: true, title: true, slug: true,
    _count: { select: { views: true, likes: true } },
    publishedAt: true,
  },
  orderBy: { views: { _count: 'desc' } },
  take: 10,
})
```

### 3. `BlogEngagementWidget.tsx` — size: `md`

Dual-line chart: total views vs total likes over time (last N days).  
Two lines in the same Recharts `LineChart`, legend below.

---

## Role Scoping

- **EDITOR**: queries add `where: { authorId: session.userId }` — only their posts
- **ADMIN / SUPER_ADMIN**: queries scope by `clientId` only

This logic lives in `dashboard-queries.ts`, not in the widget components.

---

## Files

```
src/app/dashboard/_widgets/
  BlogViewsChartWidget.tsx
  TopPostsWidget.tsx
  BlogEngagementWidget.tsx
src/app/dashboard/_data/dashboard-queries.ts   ← add blog query functions
```

---

## Acceptance Criteria

- [ ] `BlogViewsChartWidget` renders an area chart with correct date-bucketed data
- [ ] `TopPostsWidget` table hides Likes + date columns on mobile
- [ ] `BlogEngagementWidget` shows two distinct lines with a legend
- [ ] All three widgets show a skeleton when `loading` prop is set on their `WidgetCard`
- [ ] EDITOR-scoped queries only return the current user's posts
- [ ] Run `npx shadcn add chart` if the chart component is not already installed
