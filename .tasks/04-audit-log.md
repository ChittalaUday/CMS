# Task: Audit Log / Activity History

**Priority:** Tier 2  
**Status:** TODO  
**Estimated effort:** 2 days

---

## Goal

Track every significant mutation in the system — who did what, to which entity, and when. SUPER_ADMIN can browse the full audit trail at `/dashboard/audit`. Essential for debugging, compliance, and accountability in a multi-user CMS.

---

## Schema Change

```prisma
// prisma/schema.prisma

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  PUBLISH
  UNPUBLISH
  SCHEDULE
  LOGIN
  LOGOUT
  INVITE_SENT
  INVITE_ACCEPTED
  STATUS_CHANGED
}

model AuditLog {
  id          String      @id @default(cuid())
  userId      String?     // null for anonymous/system actions
  user        User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  action      AuditAction
  entityType  String      // "Post" | "JobPosting" | "JobApplication" | "User" | "Comment" | "Media"
  entityId    String
  entityLabel String?     // human-readable name at time of action (post title, user email, etc.)
  diff        Json?       // { before: {...}, after: {...} } — partial snapshot of changed fields
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

Run `npm run prisma:migrate` after adding.

---

## Logging Helper

```
src/lib/audit.ts
```

```ts
// Single function called inside every server action that mutates data
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  entityLabel,
  diff,
}: AuditInput) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, entityLabel, diff },
  })
}
```

Keep it fire-and-forget — wrap in a `try/catch` so audit log failures never break the main operation.

---

## Where to Call `logAudit`

Add calls to the following server actions (pass the current session userId):

| Action File | Events to log |
|---|---|
| `blogs/actions.ts` | CREATE, UPDATE, DELETE, PUBLISH, SCHEDULE |
| `careers/actions.ts` | CREATE, UPDATE, DELETE, PUBLISH, SCHEDULE, STATUS_CHANGED (application) |
| `_actions/auth.ts` | LOGIN, LOGOUT |
| `_actions/users.ts` | CREATE (INVITE_SENT), DELETE, UPDATE |
| `_actions/invites.ts` | INVITE_ACCEPTED |
| `_actions/settings.ts` | UPDATE |

For UPDATE actions, pass a `diff` with only the fields that changed (not the full object — no passwords/tokens).

---

## Dashboard Page

```
src/app/dashboard/audit/
  page.tsx              ← server component, paginated AuditLog query
  loading.tsx           ← skeleton
  AuditLogTable.tsx     ← table component
  AuditFilters.tsx      ← filter controls
```

### Filters
- User (select from all users)
- Entity type (Post, Job, Application, User, Comment)
- Action type
- Date range (from / to)

### Table Columns
| Column | Content |
|---|---|
| When | Relative time + tooltip with exact datetime |
| User | Avatar + name (or "System" if null) |
| Action | Colored badge (CREATE=blue, DELETE=red, PUBLISH=green, etc.) |
| Entity | Type + label (e.g. "Post — My First Blog") |
| Details | Expandable row with JSON diff viewer |

---

## Files to Create / Modify

```
prisma/schema.prisma                   ← AuditLog model + AuditAction enum
src/lib/audit.ts                       ← logAudit helper
src/app/dashboard/audit/page.tsx       ← new audit page
src/app/dashboard/audit/loading.tsx
src/app/dashboard/audit/AuditLogTable.tsx
src/app/dashboard/audit/AuditFilters.tsx
src/app/dashboard/blogs/actions.ts     ← add logAudit calls
src/app/dashboard/careers/actions.ts   ← add logAudit calls
src/app/_actions/auth.ts               ← add logAudit calls
src/app/_actions/users.ts              ← add logAudit calls
src/app/_actions/invites.ts            ← add logAudit calls
src/components/app-sidebar.tsx         ← add Audit nav item (SUPER_ADMIN only)
```

---

## Access Control

- `/dashboard/audit` is visible and accessible to **SUPER_ADMIN only**.
- Regular ADMIN can see audit logs scoped to their own actions only (optional enhancement).

---

## Acceptance Criteria

- [ ] `AuditLog` model migrated to DB
- [ ] `logAudit` called in all listed server actions without breaking them
- [ ] Audit page loads with paginated log entries
- [ ] Filters work (by user, entity type, date range)
- [ ] Diff column shows changed fields (not full objects)
- [ ] No passwords, tokens, or sensitive fields ever appear in `diff`
- [ ] Page accessible only to SUPER_ADMIN
- [ ] Audit log write failures do not surface to the user
