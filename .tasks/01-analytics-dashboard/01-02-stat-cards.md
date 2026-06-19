# 01-02 — Stat Summary Cards

**Parent:** [01 Analytics Dashboard](../01-analytics-dashboard.md)  
**Status:** TODO  
**Effort:** 0.5 days  
**Linear:** UDA-58  
**Depends on:** 01-01 (WidgetCard base)

---

## Goal

Build a generic `StatCard` widget and the four role-gated stat cards that sit at the top of the dashboard. Each card shows a single KPI number with a label, icon, and optional trend arrow.

---

## Component

### `src/app/dashboard/_widgets/StatCard.tsx`

```tsx
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType    // lucide icon
  trend?: {
    value: number            // percentage change
    direction: "up" | "down" | "neutral"
    label: string            // e.g. "vs last 30d"
  }
  size?: WidgetSize          // defaults to "sm"
}
```

- Uses `WidgetCard` as the shell
- Icon rendered at 20px in a muted rounded square
- Trend rendered as colored badge (`text-green-600` / `text-red-600`)
- Value font: `text-3xl font-bold`

---

## Stat Cards by Role

| Card | Visible to | Prisma query |
|------|-----------|-------------|
| Total Published Posts | SUPER_ADMIN, ADMIN, EDITOR | `post.count({ where: { publishedAt: { not: null } } })` |
| Total Views (all time) | SUPER_ADMIN, ADMIN, EDITOR | `view.count()` |
| Open Job Postings | SUPER_ADMIN, ADMIN, HR | `jobPosting.count({ where: { status: "PUBLISHED" } })` |
| New Applications (30d) | SUPER_ADMIN, ADMIN, HR | `jobApplication.count({ where: { createdAt: { gte: sub30d } } })` |

All queries in `src/app/dashboard/_data/dashboard-queries.ts` — stat cards are data-free components that accept pre-fetched values as props.

---

## Files

```
src/app/dashboard/_widgets/StatCard.tsx
src/app/dashboard/_data/dashboard-queries.ts   ← start this file here with stat queries
```

---

## Acceptance Criteria

- [ ] `StatCard` renders value, label, icon, and optional trend in a `WidgetCard` shell
- [ ] Trend badge is green for "up" (for views/posts) and red for "down"
- [ ] Each stat card is `size="sm"` — four of them fill a 4-col row on desktop
- [ ] On mobile all four stack vertically
- [ ] Data is fetched in the server component (`page.tsx`), not inside the card
