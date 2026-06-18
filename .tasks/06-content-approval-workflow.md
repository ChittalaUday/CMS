# Task: Content Approval Workflow

**Priority:** Tier 2  
**Status:** TODO  
**Estimated effort:** 2 days

---

## Goal

Prevent editors from publishing directly to production. EDITOR role submits content for review; ADMIN/SUPER_ADMIN review it in a dedicated inbox and approve or reject with a comment. Maintains content quality control in a multi-author CMS.

---

## Schema Changes

### Add `UNDER_REVIEW` to post/job status

For **Posts**, add a new status by extending the existing `publishedAt` / draft logic:

```prisma
// Add to Post model
reviewStatus   PostReviewStatus  @default(NONE)
reviewNote     String?           // rejection reason from reviewer
reviewedBy     String?           // userId of reviewer
reviewedAt     DateTime?

enum PostReviewStatus {
  NONE          // not submitted for review (default)
  PENDING       // submitted, awaiting review
  APPROVED      // approved — can be published
  REJECTED      // rejected — returned to editor with note
}
```

Apply the same fields to `JobPosting`.

Run `npm run prisma:migrate` after changes.

---

## Role Logic Changes

**Current behavior (to change):**
- EDITOR can call `publishPost()` directly.

**New behavior:**
- EDITOR can only call `submitForReview(postId)` — sets `reviewStatus = PENDING`.
- ADMIN / SUPER_ADMIN can call `approvePost(postId)` (publishes) or `rejectPost(postId, note)` (sets `reviewStatus = REJECTED`, stores the note).
- Admins can still publish directly without review.

Update `PublishButton.tsx` to show "Submit for Review" when the current user is an EDITOR.

---

## Review Inbox

```
src/app/dashboard/reviews/
  page.tsx              ← server component, lists all PENDING items
  loading.tsx
  ReviewsInbox.tsx      ← table of pending posts + jobs
  ReviewDetailSheet.tsx ← full preview + approve/reject controls
  actions.ts            ← submitForReview, approvePost, rejectPost, approveJob, rejectJob
```

### Inbox Table Columns
| Column | Notes |
|---|---|
| Type | Badge: Post / Job |
| Title | Links to preview |
| Author | Name + avatar |
| Submitted | Relative time |
| Actions | Approve / Reject buttons |

Approve opens a confirm dialog.  
Reject opens a Sheet/Dialog with a required `<Textarea>` for the rejection reason before confirming.

---

## Rejection Flow (Editor View)

When a post is rejected:
- `reviewStatus = REJECTED`, `reviewNote` stores the admin's comment.
- The blog edit page shows a highlighted `Alert` at the top: *"This post was rejected: [reviewNote]. Please revise and resubmit."*
- The editor can edit and resubmit (sets `reviewStatus = PENDING` again, clears `reviewNote`).

---

## Sidebar Integration

Add a "Reviews" item to the sidebar visible only to ADMIN and SUPER_ADMIN. Show a badge with the count of `PENDING` items if > 0. Use `MessageSquareWarning` icon from lucide-react.

---

## Server Actions (`reviews/actions.ts`)

```ts
submitForReview(postId: string)           // EDITOR only — reviewStatus → PENDING
approvePost(postId: string)               // ADMIN+ — publishes post, reviewStatus → APPROVED
rejectPost(postId: string, note: string)  // ADMIN+ — reviewStatus → REJECTED, stores note
submitJobForReview(jobId: string)         // HR only
approveJob(jobId: string)
rejectJob(jobId: string, note: string)
getPendingReviews()                       // returns pending Posts + JobPostings
```

---

## Files to Create / Modify

```
prisma/schema.prisma                          ← PostReviewStatus enum + fields on Post, JobPosting
src/app/dashboard/reviews/page.tsx            ← new review inbox
src/app/dashboard/reviews/loading.tsx
src/app/dashboard/reviews/ReviewsInbox.tsx
src/app/dashboard/reviews/ReviewDetailSheet.tsx
src/app/dashboard/reviews/actions.ts
src/app/dashboard/blogs/PublishButton.tsx     ← show "Submit for Review" for EDITOR role
src/app/dashboard/blogs/[id]/edit/page.tsx    ← show rejection alert if reviewStatus = REJECTED
src/app/dashboard/careers/JobForm.tsx         ← show "Submit for Review" for HR role
src/components/app-sidebar.tsx               ← add Reviews nav item with pending badge
src/lib/roles.ts                              ← add canSubmitForReview(), canApproveContent() helpers
```

---

## Acceptance Criteria

- [ ] `PostReviewStatus` enum and fields migrated
- [ ] EDITOR sees "Submit for Review" instead of "Publish" button
- [ ] Submitting sets `reviewStatus = PENDING`
- [ ] Reviews inbox shows all pending posts and jobs
- [ ] Approving publishes the post and clears review fields
- [ ] Rejecting stores the note and returns post to editor
- [ ] Editor sees rejection alert with note on edit page
- [ ] Resubmitting after rejection resets to PENDING
- [ ] Sidebar badge shows pending review count
- [ ] ADMIN can still publish directly without going through review
- [ ] No EDITOR can directly call `publishPost` (server action validates role)
