# Task: Kanban Board for Job Applications

**Priority:** Tier 2  
**Status:** TODO  
**Estimated effort:** 2 days

---

## Goal

Replace (or augment) the flat table in `ApplicationsView.tsx` with a drag-and-drop kanban board. Each column represents an `ApplicationStatus`. Dragging a card calls `updateApplicationStatus`. This is far more intuitive for HR workflows than a status-filtered table.

---

## Dependency

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

`@dnd-kit` is the standard for drag-and-drop in React 19 / Next.js App Router (no deprecated `react-beautiful-dnd`).

---

## Board Layout

Five columns in order:
```
NEW  →  REVIEWING  →  SHORTLISTED  →  REJECTED  |  HIRED
```

`REJECTED` and `HIRED` are terminal states — cards can be dragged in but not out (optional enforcement).

Each column shows:
- Column header with status label + count badge
- Scrollable list of application cards
- Empty state when no cards in column

---

## Application Card

Each card shows:
- Applicant name + initials avatar
- Applied date (relative)
- ATS score badge (colored: green ≥ 70, yellow 40–69, red < 40) — only shown if scored
- Resume link (opens PDF viewer or new tab)
- "View Details" button → opens a Sheet/Dialog with full application info

---

## View Toggle

Add a toggle in the applications page header:
- **Table view** (existing `ApplicationsView.tsx`)
- **Board view** (new `ApplicationsKanban.tsx`)

Persist the preference in `localStorage` (or a Zustand store via `editor-prefs-store` pattern).

---

## Drag and Drop Logic

On `dragEnd`:
1. Optimistically update the card's column in local state.
2. Call `updateApplicationStatus(applicationId, newStatus)` server action.
3. On error: revert the optimistic update + show a sonner toast error.

Use `useSortable` from `@dnd-kit/sortable` for cards within a column, and `useDroppable` from `@dnd-kit/core` for each column container.

---

## Files to Create / Modify

```
src/app/dashboard/careers/[id]/applications/
  page.tsx                    ← add view toggle state (searchParam: ?view=board|table)
  ApplicationsView.tsx        ← existing table — keep as-is
  ApplicationsKanban.tsx      ← new kanban board component
  KanbanColumn.tsx            ← single column (droppable)
  KanbanCard.tsx              ← single application card (draggable)
  ApplicationDetailSheet.tsx  ← full application detail in a Sheet
```

---

## ApplicationsKanban Component Structure

```tsx
// ApplicationsKanban.tsx
<DndContext onDragEnd={handleDragEnd}>
  <div className="flex gap-4 overflow-x-auto pb-4">
    {STATUSES.map((status) => (
      <KanbanColumn
        key={status}
        status={status}
        applications={grouped[status] ?? []}
      />
    ))}
  </div>
</DndContext>
```

```tsx
// KanbanColumn.tsx
<div className="w-72 flex-shrink-0">
  <div className="flex items-center justify-between mb-3">
    <span>{STATUS_LABELS[status]}</span>
    <Badge>{applications.length}</Badge>
  </div>
  <SortableContext items={applications.map(a => a.id)}>
    <div className="space-y-2 min-h-[200px]">
      {applications.map(app => <KanbanCard key={app.id} application={app} />)}
    </div>
  </SortableContext>
</div>
```

---

## Status Label & Color Map

```ts
const STATUS_CONFIG = {
  NEW:          { label: 'New',          color: 'bg-blue-500' },
  REVIEWING:    { label: 'Reviewing',    color: 'bg-yellow-500' },
  SHORTLISTED:  { label: 'Shortlisted',  color: 'bg-purple-500' },
  REJECTED:     { label: 'Rejected',     color: 'bg-red-500' },
  HIRED:        { label: 'Hired',        color: 'bg-green-500' },
}
```

---

## Mobile Behavior

On mobile (< `md`), show only one column at a time with horizontal swipe or a tab-style column selector. Drag-and-drop is disabled on touch — replaced with a status dropdown on each card instead.

---

## Acceptance Criteria

- [ ] Kanban board renders all applications grouped by status
- [ ] Dragging a card to a new column calls `updateApplicationStatus`
- [ ] Optimistic update reverts on server error with toast
- [ ] View toggle (Table / Board) persists across page navigations
- [ ] Application detail Sheet opens with full info (resume, answers, ATS score, skills)
- [ ] Empty column state is handled gracefully
- [ ] ATS score badge is color-coded
- [ ] Mobile: drag disabled, status dropdown shown instead
- [ ] No horizontal overflow at `md+` breakpoints
