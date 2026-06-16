# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Design Principles

**Before writing any UI code**, load the project design skill:

```
@.claude/skills/design-principles/SKILL.md
```

Also invoke these bundled skills for their specific domains:

| Task | Skill to invoke |
|------|----------------|
| Adding / composing shadcn components | `vercel-plugin:shadcn` |
| React component patterns, hooks, performance | `vercel-plugin:react-best-practices` |
| Next.js routing, data fetching, caching | `vercel-plugin:nextjs` |
| Building a new page or full UI section | `frontend-design` |

Key rules (full detail in the project skill file):
- **shadcn/ui only** — use `npx shadcn add <component>`, never hand-roll primitives or import from `radix-ui` directly.
- **Mobile-first** — write base styles for 390px, layer `sm:` / `md:` / `lg:` on top.
- **Semantic color tokens** — `bg-background`, `text-muted-foreground`, etc. Never hardcode `gray-*` or hex values.
- **Table responsiveness** — hide non-critical columns with `hidden md:table-cell` / `hidden lg:table-cell`; collapse action buttons on mobile with `hidden sm:contents`.
- **Editor layout** — `flex flex-col md:flex-row` for the main area; mobile controls in a top bar, settings in a bottom Sheet.
- **CMS UX** — empty states, skeleton loaders, sonner toasts, `AlertDialog` for destructive actions, `Loader2` on submit.

## Commands

```bash
npm run dev          # Start dev server on port 3010
npm run build        # Production build
npm run lint         # ESLint

# Prisma
npm run prisma:generate    # Regenerate Prisma client after schema changes
npm run prisma:migrate     # Create and apply a new migration (dev)
npm run prisma:push        # Push schema changes without a migration
npm run prisma:studio      # Open Prisma Studio GUI
npm run prisma:seed        # Seed the database
npm run prisma:reset       # Reset and reseed the database
```

There are no automated tests in this project.

## Architecture

**Next.js App Router CMS** with a Plate.js rich-text editor, AI writing assistance, and Cloudflare R2 media storage.

### Key patterns

**Server Actions via `next-safe-action`** — all mutations go through typed server actions. The base client is `src/lib/safe-action.ts` (`actionClient`). Actions live in `src/app/_actions/` and are used with `useAction` / `useOptimisticAction` on the client.

**Authentication** — custom session-based auth (no NextAuth). `src/lib/session.ts` manages cookie-backed sessions stored in the `Session` DB table. Call `getSession()` (React `cache`-wrapped) in Server Components to get the current user. Passwords hashed with bcryptjs.

**Database** — Prisma 7 with the `pg` adapter. Client singleton is `src/lib/prisma.ts`. The generated client outputs to `src/generated/prisma` (not the default location) — always import from there or via the `@/lib/prisma` singleton. Run `prisma:generate` after any schema change.

**Rich Text Editor** — Plate.js v53 (`platejs`) at `src/components/EditorialEditor.tsx` and `src/components/RichTextEditor.tsx`. Post content is stored as both serialized HTML (`content`) and Plate JSON (`contentJson`) in the `Post` model.

**AI features** — Vercel AI SDK routes at `src/app/api/ai/`. Uses `@ai-sdk/gateway` with `AI_GATEWAY_API_KEY` to reach Claude. Streaming responses use the AI SDK's standard `streamText` pattern.

**Media / File uploads** — dual pipeline:
- **UploadThing** (`src/lib/uploadthing.ts`, route at `src/app/api/uploadthing/`) for user-facing uploads in the editor
- **Cloudflare R2** (`src/lib/s3.ts`) as the underlying object store; public URLs constructed from `CLOUDFLARE_R2_PUBLIC_URL`

**UI** — shadcn/ui (radix-nova style, Tailwind CSS 4). Add components with `npx shadcn add <component>`. Component aliases: `@/components/ui`, `@/hooks`, `@/lib/utils`.

### Data model summary

`User` (SUPER_ADMIN / ADMIN / EDITOR) → `Post` (stores Plate JSON + HTML) → `Category` (many-to-many via `PostCategory`), `Media` (many-to-many via `PostMedia`), `Comment`, `Like`, `View`. `Media` records track files uploaded to R2/UploadThing.

### Route protection — two layers

1. **`src/proxy.ts`** (Next.js 16 edge proxy) — cookie presence check, CSRF validation, and security headers (`X-Frame-Options`, CSP, etc.) on every request before it hits a route handler. This is the primary auth gate.
2. **`src/app/dashboard/layout.tsx`** — server-side `getSession()` DB check that redirects to `/` if the session is invalid or expired. The proxy handles the fast-path; the layout validates the DB-stored session.

### Error boundaries

- `src/app/error.tsx` — global error boundary (catches unhandled errors in all routes)
- `src/app/dashboard/error.tsx` — dashboard-scoped error boundary with a "Go to dashboard" escape hatch
- `src/app/not-found.tsx` — global 404 page

### Health check

`GET /api/health` — runs a `prisma.user.count()` to verify DB connectivity. Returns `200 { status: "ok" }` or `503 { status: "error" }`.

### TypeScript conventions

- Prisma types (`Prisma.PostWhereInput`, `Prisma.UserUpdateInput`, `Prisma.InputJsonValue`) are imported from `@/generated/prisma/client` — never use `any` for DB inputs.
- Shared input type for post mutations: `PostInput` exported from `src/app/dashboard/blogs/actions.ts`.
- Duck-type Prisma error helpers in `blogs/actions.ts` use `Record<string, unknown>` narrowing (not `any`) to work around Prisma 7 + Turbopack `instanceof` breakage.

### Path alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).
