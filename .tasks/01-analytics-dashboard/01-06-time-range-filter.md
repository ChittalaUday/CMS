# 01-06 — Time Range Filter (7d / 30d / 90d)

**Parent:** [01 Analytics Dashboard](../01-analytics-dashboard.md)  
**Status:** TODO  
**Effort:** 0.25 days  
**Linear:** UDA-62  
**Depends on:** 01-05

---

## Goal

Add a global time-range selector to the dashboard that controls which date window all chart widgets use. Implemented as a searchParam (`?days=30`) so it works with server components and is URL-shareable.

---

## Component

### `src/app/dashboard/_widgets/TimeRangeSelector.tsx`

`"use client"` component. Renders three pills: 7d / 30d / 90d.

```tsx
"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"

const OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
]

export function TimeRangeSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const current = Number(params.get("days") ?? 30)

  function select(days: number) {
    const next = new URLSearchParams(params)
    next.set("days", String(days))
    startTransition(() => router.replace(`${pathname}?${next}`))
  }

  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
            current === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
          disabled={isPending}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

---

## Integration Points

- Place `<TimeRangeSelector />` in the dashboard `page.tsx` header area (above the `WidgetGrid`)
- Pass `days` from `searchParams.days` down to all chart widgets as a prop
- Wrap the chart section in `<Suspense>` so switching the filter shows a skeleton without a full page reload

### searchParams in page.tsx

```ts
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days: daysParam } = await searchParams
  const days = Math.min(Math.max(Number(daysParam ?? 30), 7), 90)
  // ...
}
```

---

## Files

```
src/app/dashboard/_widgets/TimeRangeSelector.tsx
```

---

## Acceptance Criteria

- [ ] Selector renders three pills; active pill is highlighted with primary color
- [ ] Clicking a pill updates the URL (replace, not push — no browser history pollution)
- [ ] All chart widgets re-render with the new date range without full page navigation
- [ ] Default is 30d when no searchParam is present
- [ ] Value is clamped to [7, 90] server-side to prevent invalid queries
- [ ] `isPending` state dims the selector while the transition is in flight
