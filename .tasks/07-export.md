# Task: Export — Applications to CSV / Posts to Markdown

**Priority:** Tier 2  
**Status:** TODO  
**Estimated effort:** 1 day

---

## Goal

Two independent export features:
1. **Applications → CSV** — HR downloads a spreadsheet of all applications for a job posting, including ATS scores and extracted metadata.
2. **Posts → Markdown** — Editor exports any blog post as a `.md` file using the already-installed `@platejs/markdown` serializer.

---

## Feature 1: Applications CSV Export

### Where it appears
- `/dashboard/careers/[id]/applications` page
- A "Download CSV" button in the page header (next to the view toggle)
- Exports the currently filtered set (respects status filter if active), or all applications if no filter

### CSV Columns

```
Name, Email, Phone, LinkedIn, Applied At, Status, ATS Score,
Skills, Experience (years), Location, Education,
Resume URL, Cover Letter (truncated to 500 chars)
```

### Implementation

Add a route handler (not a server action — file downloads need `Response` with headers):

```
src/app/api/export/applications/[jobId]/route.ts
```

```ts
// GET /api/export/applications/[jobId]?status=SHORTLISTED
// Protected: session check, HR/ADMIN/SUPER_ADMIN only
export async function GET(req: Request, { params }) {
  // 1. Verify session & role
  // 2. Query applications with optional status filter
  // 3. Build CSV string (use a simple manual builder or 'papaparse')
  // 4. Return Response with Content-Disposition: attachment; filename="applications-[slug].csv"
}
```

Install `papaparse` for robust CSV serialization:
```bash
npm install papaparse
npm install -D @types/papaparse
```

### UI Change

In `ApplicationsView.tsx` and the page header, add:
```tsx
<Button variant="outline" size="sm" asChild>
  <a href={`/api/export/applications/${jobId}${statusFilter ? `?status=${statusFilter}` : ''}`} download>
    <Download className="h-4 w-4 mr-2" />
    Download CSV
  </a>
</Button>
```

---

## Feature 2: Posts → Markdown Export

### Where it appears
- Blog edit page (`/dashboard/blogs/[id]/edit`)
- A "Export as Markdown" option in the post actions dropdown (the `...` menu or a dedicated Export button)

### Implementation

`@platejs/markdown` is already installed. The export runs client-side — no API route needed.

```tsx
// In BlogForm.tsx or a new ExportButton.tsx
import { MarkdownPlugin } from '@platejs/markdown'

function exportAsMarkdown(editor: PlateEditor, title: string) {
  const markdown = editor.getApi(MarkdownPlugin).markdown.serialize()
  const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(title)}.md`
  a.click()
  URL.revokeObjectURL(url)
}
```

Add a `<DropdownMenuItem>` to the blog editor toolbar:
```tsx
<DropdownMenuItem onClick={() => exportAsMarkdown(editor, post.title)}>
  <FileDown className="h-4 w-4 mr-2" />
  Export as Markdown
</DropdownMenuItem>
```

---

## Files to Create / Modify

```
src/app/api/export/applications/[jobId]/route.ts   ← new CSV export route
src/app/dashboard/careers/[id]/applications/
  ApplicationsView.tsx                             ← add Download CSV button
  page.tsx                                         ← pass jobId + slug to view

src/app/dashboard/blogs/BlogForm.tsx               ← add Export Markdown menu item
  (or)
src/app/dashboard/blogs/ExportButton.tsx           ← standalone export button component

package.json                                       ← add papaparse dependency
```

---

## Access Control

- CSV export: HR, ADMIN, SUPER_ADMIN (same as applications page access)
- Markdown export: any role that can edit posts (EDITOR, ADMIN, SUPER_ADMIN)

---

## Acceptance Criteria

### CSV Export
- [ ] "Download CSV" button appears on the applications page
- [ ] Clicking triggers a file download named `applications-[job-slug].csv`
- [ ] CSV contains all expected columns
- [ ] Status filter is respected (export only filtered applications when active)
- [ ] Empty state: CSV still downloads with headers only (no error)
- [ ] Route returns 401 for unauthenticated requests and 403 for EDITOR role

### Markdown Export
- [ ] "Export as Markdown" option appears in the blog editor
- [ ] Clicking triggers a `.md` file download named `[post-slug].md`
- [ ] Exported file starts with `# [Post Title]`
- [ ] Rich text formatting (bold, headings, lists, code blocks) serializes correctly
- [ ] Works entirely client-side (no server round-trip)
