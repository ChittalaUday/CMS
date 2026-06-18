"use client"

import { useState, useEffect, useTransition, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, GitMerge, Check, Image as ImageIcon, Tag, Globe, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getRevisionComparison, publishPostDraftRevision } from "./actions"

// --- Word-level diff (for title) ---
type DiffToken = { text: string; type: "same" | "added" | "removed" }

function diffWords(a: string, b: string): DiffToken[] {
  const aT = a.match(/\S+|\s+/g) ?? []
  const bT = b.match(/\S+|\s+/g) ?? []
  const m = aT.length
  const n = bT.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        aT[i - 1] === bT[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])
  const res: DiffToken[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aT[i - 1] === bT[j - 1]) {
      res.unshift({ text: aT[i - 1], type: "same" }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      res.unshift({ text: bT[j - 1], type: "added" }); j--
    } else {
      res.unshift({ text: aT[i - 1], type: "removed" }); i--
    }
  }
  return res
}

// --- HTML block diff (for content) ---
type HtmlBlock = { html: string; text: string }
type BlockDiffRow = {
  left: { html: string; type: "same" | "added" | "removed" }
  right: { html: string; type: "same" | "added" | "removed" }
}

function extractHtmlBlocks(html: string): HtmlBlock[] {
  // Use the DOM to parse properly — no regex capturing-group artifacts
  const div = document.createElement("div")
  div.innerHTML = html
  const blocks: HtmlBlock[] = []
  div.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim()
      if (text) blocks.push({ html: text, text })
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim()
      if (text || el.tagName.toLowerCase() === "img") {
        blocks.push({ html: el.outerHTML, text })
      }
    }
  })
  return blocks
}

function diffHtmlBlocks(aHtml: string, bHtml: string): BlockDiffRow[] {
  const a = extractHtmlBlocks(aHtml)
  const b = extractHtmlBlocks(bHtml)
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1].text === b[j - 1].text
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])

  const ops: Array<{ op: "same" | "added" | "removed"; ai?: number; bi?: number }> = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].text === b[j - 1].text) {
      ops.unshift({ op: "same", ai: i - 1, bi: j - 1 }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ op: "added", bi: j - 1 }); j--
    } else {
      ops.unshift({ op: "removed", ai: i - 1 }); i--
    }
  }

  return ops.map(({ op, ai, bi }) => {
    if (op === "same")
      return { left: { html: a[ai!].html, type: "same" }, right: { html: b[bi!].html, type: "same" } }
    if (op === "removed")
      return { left: { html: a[ai!].html, type: "removed" }, right: { html: "", type: "removed" } }
    return { left: { html: "", type: "added" }, right: { html: b[bi!].html, type: "added" } }
  })
}

// ---

type ComparisonData = Awaited<ReturnType<typeof getRevisionComparison>>

interface RevisionCompareDialogProps {
  draftId: string
  trigger: ReactNode
  onPublished?: () => void
  /** Block the dialog from opening (e.g. while an auto-save is in flight) */
  disabled?: boolean
}

const HTML_STYLES =
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-1 " +
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-1 " +
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 " +
  "[&_p]:leading-relaxed [&_p]:mb-0 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-0 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-0 " +
  "[&_li]:my-0 [&_li]:py-0 [&_li]:leading-snug " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_a]:underline [&_a]:text-primary " +
  "[&_code]:font-mono [&_code]:text-[0.8em] [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold"

export function RevisionCompareDialog({
  draftId,
  trigger,
  onPublished,
  disabled = false,
}: RevisionCompareDialogProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [contentDiff, setContentDiff] = useState<BlockDiffRow[] | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setData(null)
    setContentDiff(null)
    getRevisionComparison(draftId)
      .then((d) => {
        setData(d)
        setContentDiff(diffHtmlBlocks(d.parent.content, d.draft.content))
      })
      .catch((err: Error) => toast.error(err.message || "Failed to load comparison"))
      .finally(() => setLoading(false))
  }, [open, draftId])

  const handlePublish = () => {
    startTransition(async () => {
      try {
        await publishPostDraftRevision(draftId)
        toast.success("Revision published — live post updated.")
        setOpen(false)
        onPublished?.()
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to publish revision")
      }
    })
  }

  const { parent, draft } = data ?? {}

  const titleDiff = parent && draft ? diffWords(parent.title, draft.title) : null
  const titleChanged = titleDiff?.some((t) => t.type !== "same") ?? false

  const proposedSlug = (draft?.metadata as Record<string, unknown> | null)
    ?.proposedSlug as string | undefined
  const newSlug = proposedSlug || draft?.slug
  const slugChanged = !!proposedSlug && proposedSlug !== parent?.slug

  const parentCats = parent?.categories.map((c) => c.category.name) ?? []
  const draftCats = draft?.categories.map((c) => c.category.name) ?? []
  const catsChanged =
    JSON.stringify([...parentCats].sort()) !== JSON.stringify([...draftCats].sort())

  const imageChanged = parent?.featuredImageId !== draft?.featuredImageId
  const hasContentChanges = contentDiff?.some((r) => r.left.type !== "same") ?? false

  return (
    <>
      <span className="contents" onClick={() => { if (!disabled) setOpen(true) }}>
        {trigger}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="
    w-[98vw]
    sm:w-[95vw]
    lg:w-[1400px]
    lg:max-w-[1400px]
    h-[95vh]
    flex
    flex-col
    p-0
    gap-0
    overflow-hidden
  "
        >          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <GitMerge className="size-4 text-primary" />
                Review Changes Before Publishing
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Right column replaces the live post on publish.
              </p>
            </div>
          </DialogHeader>

          {/* Loading */}
          {loading && (
            <div className="flex-1 flex items-center justify-center gap-2.5 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading comparison…</span>
            </div>
          )}

          {/* Comparison body */}
          {!loading && data && (
            <div className="flex-1 min-h-0 overflow-y-auto">

              {/* Sticky column headers */}
              <div className="grid grid-cols-2 border-b sticky top-0 bg-background z-10 shadow-sm">
                <div className="px-6 py-3 flex items-center gap-2.5 border-r">
                  <div className="size-2 rounded-full bg-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Published</span>
                  <span className="text-xs text-muted-foreground">— current live version</span>
                </div>
                <div className="px-6 py-3 flex items-center gap-2.5">
                  <div className="size-2 rounded-full bg-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Draft Revision</span>
                  <span className="text-xs text-muted-foreground">— will replace published</span>
                </div>
              </div>

              {/* Featured Image */}
              <div className="grid grid-cols-2 border-b">
                <div className="px-6 py-4 border-r">
                  <FieldLabel icon={<ImageIcon className="size-3" />} label="Featured Image" />
                  {parent?.featuredImage ? (
                    <img
                      src={parent.featuredImage.url}
                      alt=""
                      className="h-28 w-auto rounded-lg object-cover border border-border/50"
                    />
                  ) : (
                    <EmptyImage />
                  )}
                </div>
                <div className={cn("px-6 py-4", imageChanged && "bg-amber-500/5 border-l-2 border-amber-500/40")}>
                  <FieldLabel
                    icon={<ImageIcon className="size-3" />}
                    label="Featured Image"
                    changed={imageChanged}
                  />
                  {draft?.featuredImage ? (
                    <img
                      src={draft.featuredImage.url}
                      alt=""
                      className="h-28 w-auto rounded-lg object-cover border border-border/50"
                    />
                  ) : (
                    <EmptyImage />
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="grid grid-cols-2 border-b">
                <div className="px-6 py-4 border-r">
                  <FieldLabel label="Title" />
                  <p className="text-lg font-bold leading-snug text-foreground">{parent?.title}</p>
                </div>
                <div className={cn("px-6 py-4", titleChanged && "bg-amber-500/5 border-l-2 border-amber-500/40")}>
                  <FieldLabel label="Title" changed={titleChanged} />
                  <p className="text-lg font-bold leading-snug">
                    {titleDiff?.map((tok, i) => (
                      <span
                        key={i}
                        className={cn(
                          tok.type === "removed" &&
                          "bg-destructive/15 text-destructive line-through rounded-sm px-0.5",
                          tok.type === "added" &&
                          "bg-primary/10 text-primary rounded-sm px-0.5",
                        )}
                      >
                        {tok.text}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              {/* Slug */}
              <div className="grid grid-cols-2 border-b">
                <div className="px-6 py-3 border-r">
                  <FieldLabel icon={<Globe className="size-3" />} label="URL Slug" />
                  <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded">
                    /{parent?.slug}
                  </code>
                </div>
                <div className={cn("px-6 py-3", slugChanged && "bg-amber-500/5 border-l-2 border-amber-500/40")}>
                  <FieldLabel icon={<Globe className="size-3" />} label="URL Slug" changed={slugChanged} />
                  <code
                    className={cn(
                      "text-xs font-mono px-2 py-0.5 rounded",
                      slugChanged
                        ? "bg-primary/10 text-primary font-semibold"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    /{newSlug}
                  </code>
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-2 border-b">
                <div className="px-6 py-3 border-r">
                  <FieldLabel icon={<Tag className="size-3" />} label="Categories" />
                  {parentCats.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {parentCats.map((n) => (
                        <Badge key={n} variant="secondary" className="text-[11px] h-5 px-2">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">None</span>
                  )}
                </div>
                <div className={cn("px-6 py-3", catsChanged && "bg-amber-500/5 border-l-2 border-amber-500/40")}>
                  <FieldLabel icon={<Tag className="size-3" />} label="Categories" changed={catsChanged} />
                  {draftCats.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {draftCats.map((n) => (
                        <Badge
                          key={n}
                          variant="secondary"
                          className={cn(
                            "text-[11px] h-5 px-2",
                            catsChanged && !parentCats.includes(n) &&
                            "bg-primary/10 text-primary border border-primary/25",
                          )}
                        >
                          {n}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">None</span>
                  )}
                </div>
              </div>

              {/* Content diff */}
              <div>
                {/* Content section header */}
                <div className="grid grid-cols-2 bg-muted/20 border-b">
                  <div className="px-6 py-2 border-r">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">
                      Content — Published
                    </span>
                  </div>
                  <div className="px-6 py-2 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">
                      Content — Revision
                    </span>
                    {hasContentChanges && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        has changes
                      </Badge>
                    )}
                  </div>
                </div>

                {!hasContentChanges ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    <Check className="size-4 mx-auto mb-2 text-primary" />
                    Content is identical
                  </div>
                ) : (
                  contentDiff?.map((row, idx) => {
                    const isSame = row.left.type === "same"
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "grid grid-cols-2 border-b border-border/25 min-h-10",
                          isSame && "bg-transparent",
                        )}
                      >
                        {/* Left cell */}
                        <div
                          className={cn(
                            "px-6 py-3 border-r text-sm relative",
                            row.left.type === "removed" && "bg-destructive/5",
                          )}
                        >
                          {row.left.type === "removed" && (
                            <Minus className="absolute left-2 top-3.5 size-3 text-destructive select-none" />
                          )}
                          {row.left.html ? (
                            <div
                              className={cn(
                                HTML_STYLES,
                                row.left.type === "removed"
                                  ? "line-through text-destructive/70 pl-3"
                                  : "text-muted-foreground/80",
                              )}
                              dangerouslySetInnerHTML={{ __html: row.left.html }}
                            />
                          ) : (
                            <div className="h-full border border-dashed border-destructive/20 rounded" />
                          )}
                        </div>

                        {/* Right cell */}
                        <div
                          className={cn(
                            "px-6 py-3 text-sm relative",
                            row.right.type === "added" && "bg-primary/5",
                          )}
                        >
                          {row.right.type === "added" && (
                            <Plus className="absolute left-2 top-3.5 size-3 text-primary select-none" />
                          )}
                          {row.right.html ? (
                            <div
                              className={cn(
                                HTML_STYLES,
                                row.right.type === "added"
                                  ? "text-foreground pl-3"
                                  : "text-muted-foreground/80",
                              )}
                              dangerouslySetInnerHTML={{ __html: row.right.html }}
                            />
                          ) : (
                            <div className="h-full border border-dashed border-primary/20 rounded" />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="px-6 pb-8  border-t shrink-0 flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground flex-1">
              This cannot be undone — the live post updates immediately.
            </p>
            <div className="flex items-center gap-2 shrink-0 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5 px-4"
                onClick={handlePublish}
                disabled={isPending || loading || !data}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <GitMerge className="size-3.5" />
                )}
                Publish Revision
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FieldLabel({
  icon,
  label,
  changed,
}: {
  icon?: ReactNode
  label: string
  changed?: boolean
}) {
  return (
    <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest mb-2 flex items-center gap-1.5">
      {icon}
      {label}
      {changed && (
        <span className="text-primary normal-case font-semibold tracking-normal text-[10px] bg-primary/10 px-1.5 py-px rounded-full border border-primary/20">
          changed
        </span>
      )}
    </p>
  )
}

function EmptyImage() {
  return (
    <div className="h-28 w-44 rounded-lg bg-muted/40 flex items-center justify-center text-xs text-muted-foreground/50 border border-dashed border-border/50">
      No image
    </div>
  )
}
