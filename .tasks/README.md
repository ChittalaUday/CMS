# CMS Feature Tasks

Planned features beyond the current build. Each file is a self-contained implementation spec.

---

## Foundation (Do First — Blocking)

| # | Task | Effort | Status |
|---|------|--------|--------|
| 00 | [Multi-Tenant Client Architecture](./00-multi-tenancy.md) | 5–7 days | TODO |

> **This is a breaking schema change.** All other tasks that touch data models (01, 03, 04, 06) depend on `clientId` being in place. Tasks 05 and 07 are UI-only and can be built independently, but will need `clientId` wired in later if done before this.

---

## Tier 1 — High Value, Low Complexity

| # | Task | Effort | Status |
|---|------|--------|--------|
| 01 | [Analytics Dashboard](./01-analytics-dashboard.md) | 1–2 days | TODO |
| 03 | [Scheduled Publishing](./03-scheduled-publishing.md) | 1–2 days | TODO |

## Tier 2 — Medium Complexity, High Impact

| # | Task | Effort | Status |
|---|------|--------|--------|
| 04 | [Audit Log / Activity History](./04-audit-log.md) | 2 days | TODO |
| 05 | [Kanban Board for Applications](./05-kanban-applications.md) | 2 days | TODO |
| 06 | [Content Approval Workflow](./06-content-approval-workflow.md) | 2 days | TODO |
| 07 | [Export (CSV + Markdown)](./07-export.md) | 1 day | TODO |

---

## Recommended Build Order

```
00 Multi-Tenancy          ← foundation, do first
  │
  ├── 07 Export           ← no schema changes, safe to do in parallel with 00
  ├── 05 Kanban           ← UI-only, safe to do in parallel with 00
  │
  └── (after 00 is done)
        ├── 01 Analytics       ← queries already scoped by clientId
        ├── 03 Scheduling      ← adds scheduledAt, cron
        ├── 04 Audit Log       ← touches all actions (add after tenancy is stable)
        └── 06 Approval Flow   ← most invasive role change, do last
```
