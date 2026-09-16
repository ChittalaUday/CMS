---
description: Enforce design principles for this CMS — shadcn/ui patterns, mobile-first responsiveness, and CMS-specific UX conventions. Load this before writing any UI code.
---

# Design Principles — CMS Portal

> **Companion skills** (invoke these for deeper domain knowledge):
> - `vercel-plugin:shadcn` — component API, theming, CLI usage
> - `vercel-plugin:react-best-practices` — hooks, memoization, component patterns
> - `vercel-plugin:nextjs` — App Router, data fetching, caching, metadata
> - `frontend-design` — building complete new pages or full UI sections

## Stack
- **UI library**: shadcn/ui (radix-nova theme, Tailwind CSS 4)
- **Component source**: `@/components/ui/` — never import from `radix-ui` directly
- **Add new components**: `npx shadcn add <component>` — do not hand-write primitives
- **Theme**: dark-mode-first via CSS variables (`bg-background`, `text-foreground`, etc.)

---

## 1. Responsive Breakpoints (mobile-first)

| Prefix | Min-width | Use case |
|--------|-----------|----------|
| _(none)_ | 0px | Mobile phone (390px target) |
| `sm:` | 640px | Large phone / small tablet |
| `md:` | 768px | Tablet portrait |
| `lg:` | 1024px | Tablet landscape / small laptop |
| `xl:` | 1280px | Desktop |

**Rule**: Write the mobile style first, then layer wider breakpoints on top.

```tsx
// CORRECT — mobile first
<div className="flex flex-col md:flex-row gap-4 p-4 md:p-8">

// WRONG — desktop first
<div className="flex flex-row gap-4 p-8">
```

---

## 2. Sidebar & Navigation

This project uses shadcn `SidebarProvider` / `AppSidebar`. On mobile the sidebar collapses into a sheet triggered by `SidebarTrigger`.

- **Never** add a custom hamburger menu — `SidebarTrigger` already handles this.
- The trigger is in `src/app/dashboard/layout.tsx`; keep it in the header bar.
- For mobile-only settings panels use `<Sheet side="bottom">` with `max-h-[70vh] overflow-y-auto`.

---

## 3. Layout Patterns

### Dashboard pages
```tsx
// Standard page wrapper
<div className="space-y-5 w-full px-1 py-3">
  {/* Page header */}
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
    <div className="space-y-1">
      <h1 className="text-3xl font-extrabold tracking-tight">Title</h1>
      <p className="text-muted-foreground text-sm max-w-xl">Subtitle</p>
    </div>
    <Button asChild>...</Button>
  </div>
  {/* Content */}
</div>
```

### Data tables
- Always wrap tables in `<div className="rounded-xl border border-border/60 overflow-hidden shadow-sm"><div className="bg-card/40 overflow-x-auto">`.
- Hide non-essential columns on small screens:
  - `hidden md:table-cell` — Author, metadata
  - `hidden lg:table-cell` — Date, Stats
- Collapse inline action buttons on mobile using `hidden sm:contents` wrapper; keep only the `MoreHorizontal` dropdown visible on mobile.

```tsx
// Action cell pattern
<td className="px-3 sm:px-4 py-4">
  <div className="flex items-center justify-end gap-1">
    <div className="hidden sm:contents">  {/* Preview + Publish only on sm+ */}
      <Button .../>
      <PublishButton .../>
    </div>
    <DropdownMenu>...</DropdownMenu>  {/* Always visible */}
  </div>
</td>
```

### Cards / stat tiles
- Use `aspect-video rounded-xl bg-muted/50 border border-border` for stat cards.
- Grid: `grid auto-rows-min gap-4 md:grid-cols-3` (single column on mobile).

---

## 4. Editor Layout

The `EditorialEditor` uses a three-zone layout. On mobile it stacks vertically; on desktop it's a side-by-side row.

```
Mobile (flex-col):
  ┌─────────────────────────────┐
  │ Header (← Editorial | Save) │
  ├─────────────────────────────┤
  │ Mobile controls             │  ← Settings sheet + Publish
  ├──────────┬──────────────────┤
  │ Toolbar  │ Canvas           │  ← flex-row inside main
  ├─────────────────────────────┤
  │ Footer (Word / Char count)  │
  └─────────────────────────────┘

Desktop (md: flex-row):
  ┌──────────┬──────────────────┬──────────────┐
  │ Toolbar  │ Canvas           │ Post Settings│
  └──────────┴──────────────────┴──────────────┘
```

- Main area: `flex flex-col md:flex-row flex-1 min-h-0`
- Canvas padding: `px-4 md:px-12 py-6 md:py-16`
- Toolbar padding: `py-4 md:py-16 px-3 md:px-4`
- Title input: `text-2xl md:text-4xl`
- Header actions (Preview/Publish): `hidden md:flex` — mobile uses the controls bar instead.

---

## 5. Color & Token Usage

Always use semantic tokens — never hardcode `gray-*`, `slate-*`, or hex values in component classes.

| Purpose | Token |
|---------|-------|
| Page background | `bg-background` |
| Card / panel | `bg-card`, `bg-muted/50` |
| Borders | `border-border`, `border-border/60` |
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Primary action | `bg-primary text-primary-foreground` |
| Destructive | `text-destructive`, `bg-destructive` |
| Success badge | `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` |
| Warning badge | `bg-yellow-500/10 text-yellow-400 border-yellow-500/20` |

For overlays / glass effects: `bg-background/50`, `backdrop-blur-md`.

---

## 6. Typography Scale

| Element | Classes |
|---------|---------|
| Page heading | `text-3xl font-extrabold tracking-tight` |
| Section heading | `text-xl font-bold` |
| Card title | `text-lg font-semibold` |
| Body | `text-sm` |
| Label / meta | `text-xs font-semibold text-muted-foreground uppercase tracking-wider` |
| Badge / tag | `text-[10px] font-bold uppercase tracking-wider` |
| Mono / code | `font-mono text-xs` |

---

## 7. Spacing Conventions

- Page padding: `p-4` (layout wrapper) — do not override without reason.
- Section gaps: `space-y-5` or `gap-4` between major sections.
- Input height: `h-9` standard, `h-8` compact.
- Button height: `h-10` default, `h-8` compact/secondary, `h-9` mobile-primary.
- Icon buttons: `size-8 rounded-lg`.
- Rounded containers: `rounded-xl` cards/panels, `rounded-md` inputs/buttons, `rounded-lg` small chips.

---

## 8. shadcn Component Conventions

### Inputs & Forms
```tsx
<div className="space-y-2">
  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Field Name
  </Label>
  <Input className="h-9 bg-muted/30 border-border/80 text-sm" />
</div>
```

### Buttons
```tsx
// Primary CTA
<Button className="h-9 font-semibold gap-1.5 shadow-sm">
  <Icon className="size-4" /> Label
</Button>

// Outline / secondary
<Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted">

// Ghost icon
<Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-muted">
  <Icon className="size-4 text-muted-foreground" />
</Button>
```

### Badges / Status pills
```tsx
<span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
  <CheckCircle2 className="size-3" /> Published
</span>
```

### Sheet (mobile panels)
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" className="h-9 px-3 text-xs">Settings</Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Panel Title</SheetTitle>
      <SheetDescription>Subtitle</SheetDescription>
    </SheetHeader>
    <div className="space-y-6 p-4">...</div>
  </SheetContent>
</Sheet>
```

---

## 9. UX Rules for CMS

1. **Empty states**: Always provide `min-h-[360px]` empty states with an icon, heading, description, and a CTA button.
2. **Loading**: Use `<Skeleton>` for async content; never show blank space.
3. **Toasts**: Use `sonner` — `toast.success()` / `toast.error()` — not browser alerts.
4. **Destructive actions**: Require confirmation via `AlertDialog` before deleting content.
5. **Form submission**: Disable the submit button and show a `<Loader2 className="animate-spin">` while pending.
6. **Navigation breadcrumbs**: Use `DashboardBreadcrumbs` in the layout header — do not add custom breadcrumbs inside page content.
7. **Auto-save**: Show cloud save status (`isSavingStatus`) in editor headers — not a toast.
8. **Mobile-first flows**: Every CMS action (publish, delete, categorize) must be reachable on a 390px screen — via sheet, dropdown, or inline control.

---

## 10. Accessibility

- All interactive icons must have `title="..."` or `aria-label="..."`.
- Form inputs must have an associated `<Label htmlFor="...">`.
- Color alone must not convey status — always pair color with an icon or text.
- Focus rings: rely on Tailwind's `focus-visible:ring` defaults from shadcn; do not suppress them with `outline-none` unless replacing with a custom focus style.
