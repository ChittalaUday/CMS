# 01 — Analytics Dashboard: Sub-tasks

**Parent:** [01-analytics-dashboard.md](../01-analytics-dashboard.md)  
**Linear parent:** UDA-56  
**Total effort:** ~2 days

---

## Architecture Summary

The dashboard uses a **widget component system** where:

- Each widget is a self-contained React Server Component that receives pre-fetched data as props
- `WidgetGrid` is a CSS grid wrapper that auto-adjusts columns based on widget count and declared sizes
- Each role gets a different array of widgets — adding/removing a widget from the array is all that's needed to change a role's dashboard
- The layout is **healable**: no fixed heights, `auto-rows-min`, widgets always fill their declared span

## Widget Sizes → Grid Columns

```
sm   = 1 col   (stat cards, small tables)
md   = 2 cols  (medium charts, tables)
lg   = 3 cols  (primary charts)
full = 4 cols  (timelines, wide tables)

Mobile: all widgets collapse to 1 col regardless of size
```

## Role → Widget Map

| Role | Stat Cards | Blog Widgets | Careers Widgets |
|------|-----------|-------------|----------------|
| SUPER_ADMIN | All 4 | All 3 (cross-client) | All 4 (cross-client) |
| ADMIN | All 4 | All 3 (client-scoped) | All 4 (client-scoped) |
| HR | 2 (jobs + apps) | None | All 4 |
| EDITOR | 2 (posts + views) | All 3 (own posts only) | None |

## Sub-task Order

```
01-01  Widget system (WidgetGrid + WidgetCard)    ← do first, no deps
01-02  Stat cards + base data queries             ← depends on 01-01
01-03  Blog widgets                               ← depends on 01-01, 01-02
01-04  Careers widgets                            ← depends on 01-01, 01-02
01-05  Role dashboard page + composition          ← depends on all above
01-06  Time range filter                          ← depends on 01-05
```

## Sub-tasks

| # | Task | Effort | Status | Linear |
|---|------|--------|--------|--------|
| 01-01 | [Widget System & Grid Layout](./01-01-widget-system.md) | 0.5d | TODO | UDA-57 |
| 01-02 | [Stat Summary Cards](./01-02-stat-cards.md) | 0.5d | TODO | UDA-58 |
| 01-03 | [Blog Analytics Widgets](./01-03-blog-widgets.md) | 0.5d | TODO | UDA-59 |
| 01-04 | [Careers Analytics Widgets](./01-04-careers-widgets.md) | 0.5d | TODO | UDA-60 |
| 01-05 | [Role-Based Dashboard Page](./01-05-role-dashboards.md) | 0.5d | TODO | UDA-61 |
| 01-06 | [Time Range Filter](./01-06-time-range-filter.md) | 0.25d | TODO | UDA-62 |
