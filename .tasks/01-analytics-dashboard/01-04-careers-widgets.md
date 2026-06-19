# 01-04 — Careers Analytics Widgets

**Parent:** [01 Analytics Dashboard](../01-analytics-dashboard.md)  
**Status:** TODO  
**Effort:** 0.5 days  
**Linear:** UDA-60  
**Depends on:** 01-01, 01-02

---

## Goal

Build four careers-specific analytics widgets. Visible to SUPER_ADMIN, ADMIN, and HR. All queries are scoped to the active `clientId`.

---

## Widgets

### 1. `ApplicationFunnelWidget.tsx` — size: `lg`

Stacked horizontal bar chart showing application status breakdown across all jobs.  
Statuses in order: `NEW → REVIEWING → SHORTLISTED → REJECTED / HIRED`.  
Each job posting is one row; bars are colored per status.

**Prisma query:**
```ts
prisma.jobApplication.groupBy({
  by: ['jobId', 'status'],
  _count: { id: true },
  where: { job: { clientId } },
})
// Join with jobPosting titles for labels
```

### 2. `ApplicationsPerJobWidget.tsx` — size: `md`

Vertical bar chart: total applications per job posting (top 10 by count).  
X-axis: job title (truncated to 20 chars). Y-axis: application count.

**Prisma query:**
```ts
prisma.jobPosting.findMany({
  where: { clientId },
  select: {
    title: true,
    _count: { select: { applications: true } },
  },
  orderBy: { applications: { _count: 'desc' } },
  take: 10,
})
```

### 3. `ATSScoreWidget.tsx` — size: `md`

Table: job title + average ATS score + total applications.  
Colored badge for score: green (≥70), amber (40–69), red (<40).

**Prisma query:**
```ts
prisma.jobApplication.groupBy({
  by: ['jobId'],
  _avg: { atsScore: true },
  _count: { id: true },
  where: { job: { clientId }, atsScore: { not: null } },
})
```

### 4. `ApplicationsTimelineWidget.tsx` — size: `full`

Area chart: new applications per day over the last N days.  
Uses the same time-range filter as the blog charts (searchParam `days`).

**Prisma query:**
```ts
prisma.jobApplication.groupBy({
  by: ['createdAt'],
  _count: { id: true },
  where: {
    createdAt: { gte: subDays(new Date(), days) },
    job: { clientId },
  },
  orderBy: { createdAt: 'asc' },
})
```

---

## Files

```
src/app/dashboard/_widgets/
  ApplicationFunnelWidget.tsx
  ApplicationsPerJobWidget.tsx
  ATSScoreWidget.tsx
  ApplicationsTimelineWidget.tsx
src/app/dashboard/_data/dashboard-queries.ts   ← add careers query functions
```

---

## Acceptance Criteria

- [ ] `ApplicationFunnelWidget` renders status bars with distinct colors per status
- [ ] `ApplicationsPerJobWidget` bar chart labels truncate at 20 chars
- [ ] `ATSScoreWidget` badge colors match score thresholds (green/amber/red)
- [ ] `ApplicationsTimelineWidget` reacts to the time-range filter searchParam
- [ ] All four widgets show skeletons in loading state
- [ ] All queries are pre-fetched in `page.tsx`, not inside the widget
