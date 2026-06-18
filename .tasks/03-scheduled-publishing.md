# Task: Scheduled Publishing

**Priority:** Tier 1  
**Status:** TODO  
**Estimated effort:** 1–2 days

---

## Goal

Allow editors to schedule a post or job posting to automatically go live at a future date and time, instead of publishing immediately.

---

## Schema Changes

```prisma
// prisma/schema.prisma — add to Post model
scheduledAt   DateTime?   // null = not scheduled; future date = scheduled

// add to JobPosting model
scheduledAt   DateTime?
```

Add a new status value that represents "scheduled" — or rely on: `publishedAt IS NULL AND scheduledAt IS NOT NULL` as the "scheduled" state. No new enum value needed if you use this condition.

Run `npm run prisma:migrate` after changes.

---

## How It Works

1. Editor sets a future date/time via a date-time picker in the publish modal.
2. The post is saved with `scheduledAt = <future date>` but `publishedAt` remains `null`.
3. A polling route (`/api/cron/publish`) runs every minute and publishes any records where `scheduledAt <= now()` and `publishedAt IS NULL`.
4. On publish, `publishedAt` is set to `now()` and `scheduledAt` is cleared.

---

## Cron / Scheduler Route

```
src/app/api/cron/publish/route.ts
```

```ts
// GET /api/cron/publish
// Protected by a CRON_SECRET env var checked in the Authorization header
export async function GET(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) return new Response('Unauthorized', { status: 401 })

  const now = new Date()
  
  // publish scheduled posts
  await prisma.post.updateMany({
    where: { scheduledAt: { lte: now }, publishedAt: null, draftParentId: null },
    data: { publishedAt: now, scheduledAt: null },
  })

  // publish scheduled jobs
  await prisma.jobPosting.updateMany({
    where: { scheduledAt: { lte: now }, status: 'DRAFT', draftParentId: null },
    data: { status: 'PUBLISHED', scheduledAt: null },
  })

  return Response.json({ ok: true })
}
```

**Triggering the cron:** Add a `vercel.json` at the project root:
```json
{
  "crons": [{ "path": "/api/cron/publish", "schedule": "* * * * *" }]
}
```
For local development, the dev server can call the endpoint manually or use a `setInterval` in a dev-only route.

---

## UI Changes

### Publish Modal (`PublishButton.tsx` / `BlogForm.tsx`)

Replace the single "Publish Now" button with two options:
1. **Publish Now** — existing behavior
2. **Schedule** — shows a `<DateTimePicker>` (use shadcn `Calendar` + a time input); on confirm, calls a new `schedulePost(id, scheduledAt)` server action.

Display a "Scheduled for [date]" badge on the post card in the blog list table when `scheduledAt` is set and `publishedAt` is null.

### Blog / Careers Table

Add a "Scheduled" filter state in `BlogsToolbar.tsx` and `JobsToolbar.tsx`. Show a `Clock` icon with the scheduled date in the table row.

---

## Files to Create / Modify

```
src/app/api/cron/publish/route.ts         ← new cron handler
vercel.json                               ← new cron schedule config
prisma/schema.prisma                      ← add scheduledAt fields
src/app/dashboard/blogs/actions.ts        ← add schedulePost(), unschedulePost()
src/app/dashboard/careers/actions.ts      ← add scheduleJob(), unscheduleJob()
src/app/dashboard/blogs/PublishButton.tsx ← add schedule option + date picker
src/app/dashboard/blogs/BlogsTableClient.tsx ← show "Scheduled" state
src/app/dashboard/careers/CareersTableClient.tsx ← show "Scheduled" state
```

---

## Environment Variables

```
CRON_SECRET=<random-secure-string>    # used to authenticate the cron endpoint
```

---

## Acceptance Criteria

- [ ] `scheduledAt` field added to `Post` and `JobPosting` with migration
- [ ] Publish modal has "Schedule" option with date/time picker
- [ ] Scheduling a post saves `scheduledAt` and keeps `publishedAt` null
- [ ] Table shows "Scheduled" badge with the scheduled date
- [ ] Cron endpoint publishes overdue scheduled posts/jobs correctly
- [ ] Cron endpoint is protected (returns 401 without correct secret)
- [ ] Unschedule (cancel) clears `scheduledAt` and returns post to DRAFT
- [ ] `vercel.json` cron fires every minute on Vercel production
