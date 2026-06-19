# 01-01 — Widget System: Grid Layout + Base Components

**Parent:** [01 Analytics Dashboard](../01-analytics-dashboard.md)  
**Status:** TODO  
**Effort:** 0.5 days  
**Linear:** UDA-57

---

## Goal

Build the foundational widget infrastructure that all dashboard widgets are composed from. The grid must auto-adjust — when a role sees 3 widgets instead of 10, the layout collapses naturally without empty gaps.

---

## Components to Create

### `src/app/dashboard/_widgets/WidgetGrid.tsx`

Server + client compatible wrapper. Accepts an array of widget configs and renders them in a responsive CSS grid.

```tsx
type WidgetSize = "sm" | "md" | "lg" | "full"

interface WidgetSlot {
  id: string
  size: WidgetSize      // maps to col-span
  children: React.ReactNode
}

// Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
// Spans:
//   sm   → col-span-1
//   md   → col-span-1 sm:col-span-2
//   lg   → col-span-1 sm:col-span-2 lg:col-span-3
//   full → col-span-full
```

Key: use `auto-rows-min` so rows shrink to content. No fixed heights on the grid itself.

### `src/app/dashboard/_widgets/WidgetCard.tsx`

Base shell for every widget. Provides consistent padding, border, rounded corners, and a loading skeleton state.

```tsx
interface WidgetCardProps {
  title: string
  description?: string
  loading?: boolean
  children: React.ReactNode
  action?: React.ReactNode   // optional top-right slot (e.g. time range pill)
}
```

Loading state renders a `Skeleton` from shadcn inside the card body — no layout shift.

---

## Size → Column Span Mapping

| Size   | Mobile (1 col) | sm (2 col) | lg (4 col) |
|--------|---------------|-----------|-----------|
| `sm`   | 1             | 1         | 1         |
| `md`   | 1             | 2         | 2         |
| `lg`   | 1             | 2         | 3         |
| `full` | 1             | 2         | 4         |

This means on mobile every widget is full width regardless of declared size.

---

## Files

```
src/app/dashboard/_widgets/
  WidgetGrid.tsx
  WidgetCard.tsx
  index.ts          ← barrel export
```

---

## Acceptance Criteria

- [ ] `WidgetGrid` renders widgets in a 4-col grid on desktop, 2-col on tablet, 1-col on mobile
- [ ] Grid rows shrink to content height (`auto-rows-min`)
- [ ] `WidgetCard` has a `loading` prop that shows a skeleton instead of children
- [ ] No fixed heights — layout heals automatically when widgets are added/removed
- [ ] Both components are pure RSC-compatible (no `"use client"`)
