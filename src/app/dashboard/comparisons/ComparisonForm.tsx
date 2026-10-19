"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Table2,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ClientSelect } from "@/components/ClientSelect"
import { ClientMove } from "@/components/ClientMove"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toSlug } from "@/lib/careers/slug-helper"
import {
  COMPARISON_LIMITS,
  comparisonInputSchema,
  type ComparisonFormValues,
} from "@/lib/comparisons/schema"
import {
  checkComparisonSlugAvailability,
  createComparisonAction,
  updateComparisonAction,
} from "./actions"

type EditorOption = { key: number; label: string; linkSlug: string }
type EditorCriterion = { key: number; label: string; values: string[] }
type SlugStatus = { state: "idle" | "checking" | "available" | "taken"; suggestion?: string }

const EMPTY: ComparisonFormValues = {
  title: "",
  slug: "",
  description: "",
  disclaimer: "",
  seoTitle: "",
  seoDescription: "",
  relatedServiceSlugs: [],
  published: false,
  options: [],
  criteria: [],
}

// Stable React keys for editor rows, so reordering/removing keeps focus on the right input.
let keyCounter = 0
const nextKey = () => ++keyCounter

/** Canonical serialisation (fixed key order) used to detect unsaved changes. */
const snapshot = (v: ComparisonFormValues) =>
  JSON.stringify([
    v.title, v.slug, v.description, v.disclaimer, v.seoTitle, v.seoDescription, v.published,
    v.relatedServiceSlugs,
    v.options.map((o) => [o.label, o.linkSlug]),
    v.criteria.map((c) => [c.label, c.values]),
  ])

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

interface Props {
  /** Present when editing an existing comparison. */
  comparisonId?: string
  initial?: ComparisonFormValues
  /** Super admin only: clients a new comparison can be created for. */
  clients?: { id: string; name: string }[]
  defaultClientId?: string | null
}

export function ComparisonForm({ comparisonId, initial = EMPTY, clients = [], defaultClientId = null }: Props) {
  const router = useRouter()
  const [clientId, setClientId] = useState(defaultClientId ?? "")
  const [fields, setFields] = useState(() => ({
    title: initial.title,
    slug: initial.slug,
    description: initial.description,
    disclaimer: initial.disclaimer,
    seoTitle: initial.seoTitle,
    seoDescription: initial.seoDescription,
    published: initial.published,
  }))
  const [serviceSlugs, setServiceSlugs] = useState(initial.relatedServiceSlugs)
  const [serviceDraft, setServiceDraft] = useState("")
  const [options, setOptions] = useState<EditorOption[]>(() =>
    initial.options.map((o) => ({ key: nextKey(), ...o }))
  )
  const [criteria, setCriteria] = useState<EditorCriterion[]>(() =>
    initial.criteria.map((c) => ({ key: nextKey(), label: c.label, values: [...c.values] }))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" })
  const [leaveOpen, setLeaveOpen] = useState(false)
  const slugEditedRef = useRef(!!comparisonId)
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slugRequestRef = useRef(0)

  // What the form currently holds, in the shape the API expects (editor-only keys stripped).
  const current: ComparisonFormValues = useMemo(
    () => ({
      ...fields,
      relatedServiceSlugs: serviceSlugs,
      options: options.map(({ label, linkSlug }) => ({ label, linkSlug })),
      criteria: criteria.map(({ label, values }) => ({ label, values })),
    }),
    [fields, serviceSlugs, options, criteria]
  )
  const [baseline, setBaseline] = useState(() => snapshot(initial))
  // Snapshot of what was actually sent, so edits made while a save is in flight stay "unsaved".
  const sentRef = useRef("")
  const dirty = snapshot(current) !== baseline

  const onError = ({ error }: { error: { serverError?: string } }) =>
    toast.error(error.serverError ?? "Failed to save comparison")

  const create = useAction(createComparisonAction, {
    onSuccess: ({ data }) => {
      toast.success("Comparison created")
      setBaseline(sentRef.current)
      router.replace(`/dashboard/comparisons/${data?.id}/edit`)
    },
    onError,
  })
  const update = useAction(updateComparisonAction, {
    onSuccess: () => {
      toast.success("Comparison saved")
      setBaseline(sentRef.current)
    },
    onError,
  })
  const saving = create.isPending || update.isPending

  // Warn on tab close / reload while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  useEffect(() => () => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
  }, [])

  const setField = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) => {
    setFields((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e))
  }

  // ── Slug ────────────────────────────────────────────────────────────────

  const scheduleSlugCheck = (slug: string) => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    const request = ++slugRequestRef.current
    if (!slug) return setSlugStatus({ state: "idle" })
    setSlugStatus({ state: "checking" })
    slugTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkComparisonSlugAvailability(slug, comparisonId, clientId || undefined)
        if (request !== slugRequestRef.current) return
        setSlugStatus(res.available ? { state: "available" } : { state: "taken", suggestion: res.suggestedSlug })
      } catch {
        if (request === slugRequestRef.current) setSlugStatus({ state: "idle" })
      }
    }, 500)
  }

  const onTitleChange = (title: string) => {
    setField("title", title)
    if (!slugEditedRef.current) {
      const slug = toSlug(title)
      setField("slug", slug)
      scheduleSlugCheck(slug)
    }
  }

  const onSlugChange = (raw: string) => {
    slugEditedRef.current = true
    // Keep a single trailing hyphen while typing ("a-" -> "a-b"); save() trims it.
    const slug = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+/, "")
    setField("slug", slug)
    scheduleSlugCheck(slug)
  }

  // ── Related service slugs ───────────────────────────────────────────────

  const addServiceSlugs = (raw: string) => {
    const added = raw.split(",").map(toSlug).filter(Boolean)
    if (added.length === 0) return
    setServiceSlugs((prev) => [...new Set([...prev, ...added])].slice(0, COMPARISON_LIMITS.maxServiceSlugs))
    setServiceDraft("")
  }

  // ── Grid ────────────────────────────────────────────────────────────────

  const addOption = () => {
    setOptions((o) => [...o, { key: nextKey(), label: "", linkSlug: "" }])
    setCriteria((c) => c.map((row) => ({ ...row, values: [...row.values, ""] })))
  }
  const removeOption = (i: number) => {
    setOptions((o) => o.filter((_, idx) => idx !== i))
    setCriteria((c) => c.map((row) => ({ ...row, values: row.values.filter((_, idx) => idx !== i) })))
  }
  const moveOption = (i: number, to: number) => {
    if (to < 0 || to >= options.length) return
    setOptions((o) => move(o, i, to))
    setCriteria((c) => c.map((row) => ({ ...row, values: move(row.values, i, to) })))
  }
  const patchOption = (i: number, patch: Partial<EditorOption>) =>
    setOptions((o) => o.map((opt, idx) => (idx === i ? { ...opt, ...patch } : opt)))

  const addCriterion = () =>
    setCriteria((c) => [...c, { key: nextKey(), label: "", values: options.map(() => "") }])
  const patchCriterion = (i: number, patch: Partial<EditorCriterion>) =>
    setCriteria((c) => c.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const setCell = (row: number, col: number, value: string) =>
    setCriteria((c) =>
      c.map((r, idx) => (idx === row ? { ...r, values: r.values.map((v, j) => (j === col ? value : v)) } : r))
    )

  // ── Save ────────────────────────────────────────────────────────────────

  const save = () => {
    const trimmedSlug = fields.slug.replace(/-+$/, "")
    if (trimmedSlug !== fields.slug) setField("slug", trimmedSlug)
    const toSend = { ...current, slug: trimmedSlug }
    const result = comparisonInputSchema.safeParse(toSend)
    if (!result.success) {
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = String(issue.path[0] ?? "form")
        next[path] ??= issue.message
      }
      setErrors(next)
      toast.error(result.error.issues[0]?.message ?? "Please fix the highlighted fields")
      return
    }
    setErrors({})
    sentRef.current = snapshot(toSend)
    if (comparisonId) update.execute({ id: comparisonId, data: result.data })
    else if (clients.length > 0 && !clientId) {
      toast.error("Select a client for this comparison")
      return
    } else create.execute({ ...result.data, clientId: clientId || undefined })
  }

  const leave = () => {
    if (dirty) setLeaveOpen(true)
    else router.push("/dashboard/comparisons")
  }

  const gridError = errors.options || errors.criteria
  const err = (key: string) => (errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null)

  const emptyCells = criteria.reduce(
    (n, row) => n + options.filter((_, c) => !(row.values[c] ?? "").trim()).length,
    0
  )
  const checklist = [
    { label: "Title and URL slug", ok: !!fields.title.trim() && !!fields.slug && slugStatus.state !== "taken" },
    { label: "At least 2 labelled columns", ok: options.length >= 2 && options.every((o) => o.label.trim()) },
    { label: "At least 1 labelled row", ok: criteria.length >= 1 && criteria.every((r) => r.label.trim()) },
  ]
  const ready = checklist.every((c) => c.ok)

  const panel = "rounded-xl border border-border/60 bg-card/30 p-4 space-y-4"
  const sectionLabel = "text-xs font-semibold text-muted-foreground uppercase tracking-wider"

  const startGrid = () => {
    setOptions([{ key: nextKey(), label: "", linkSlug: "" }, { key: nextKey(), label: "", linkSlug: "" }])
    setCriteria([{ key: nextKey(), label: "", values: ["", ""] }])
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Details */}
          <section className={panel}>
            {comparisonId ? (
              <ClientMove kind="comparison" id={comparisonId} currentClientId={defaultClientId} clients={clients} redirectTo="/dashboard/comparisons" disabled={saving} className="space-y-1.5" />
            ) : (
              <ClientSelect clients={clients} value={clientId} onChange={setClientId} className="space-y-1.5" />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cmp-title" className={sectionLabel}>Title</Label>
              <Input
                id="cmp-title"
                value={fields.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Private Limited vs LLP vs Proprietorship"
                aria-invalid={!!errors.title}
                maxLength={200}
                className="h-11 text-base font-medium"
              />
              {err("title")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cmp-slug" className={sectionLabel}>URL slug</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/</span>
                <Input
                  id="cmp-slug"
                  value={fields.slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  placeholder="private-limited-vs-llp"
                  aria-invalid={!!errors.slug || slugStatus.state === "taken"}
                  maxLength={200}
                  className="h-9 pl-6 font-mono text-sm"
                />
              </div>
              {err("slug")}
              {slugStatus.state === "checking" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Checking availability…
                </p>
              )}
              {slugStatus.state === "available" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Slug is available
                </p>
              )}
              {slugStatus.state === "taken" && (
                <p className="text-xs text-destructive flex flex-wrap items-center gap-x-2">
                  This slug is already used.
                  {slugStatus.suggestion && (
                    <button
                      type="button"
                      className="underline underline-offset-2 font-medium"
                      onClick={() => onSlugChange(slugStatus.suggestion!)}
                    >
                      Use {slugStatus.suggestion}
                    </button>
                  )}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cmp-description" className={sectionLabel}>Intro (above the table)</Label>
                <Textarea
                  id="cmp-description"
                  value={fields.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="One or two sentences."
                  maxLength={2000}
                  className="min-h-20 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cmp-disclaimer" className={sectionLabel}>Disclaimer (below the table)</Label>
                <Textarea
                  id="cmp-disclaimer"
                  value={fields.disclaimer}
                  onChange={(e) => setField("disclaimer", e.target.value)}
                  placeholder="e.g. General guidance only."
                  maxLength={2000}
                  className="min-h-20 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Table editor */}
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-foreground">Comparison table</h2>
                <p className="text-xs text-muted-foreground">
                  {options.length} {options.length === 1 ? "column" : "columns"} × {criteria.length}{" "}
                  {criteria.length === 1 ? "row" : "rows"}
                  {emptyCells > 0 && ` · ${emptyCells} empty ${emptyCells === 1 ? "cell" : "cells"}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={addOption}
                  disabled={options.length >= COMPARISON_LIMITS.maxOptions}
                >
                  <Plus className="size-3.5" /> Column
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={addCriterion}
                  disabled={options.length === 0 || criteria.length >= COMPARISON_LIMITS.maxCriteria}
                >
                  <Plus className="size-3.5" /> Row
                </Button>
              </div>
            </div>

            {options.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-6 py-10 text-center space-y-3">
                <Table2 className="size-7 mx-auto text-muted-foreground/60" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Build your table</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Columns are the things you compare (LLP, Private Limited). Rows are what you compare them on
                    (Minimum members, Annual compliance).
                  </p>
                </div>
                <Button type="button" size="sm" className="gap-1.5" onClick={startGrid}>
                  <Plus className="size-4" /> Start with 2 columns and 1 row
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 w-36 min-w-36 sm:w-48 sm:min-w-48 bg-muted border-b border-r border-border/60 p-2 text-left align-bottom">
                        <span className={sectionLabel}>Compare on</span>
                      </th>
                      {options.map((opt, i) => (
                        <th key={opt.key} className="min-w-48 bg-muted/60 border-b border-r border-border/60 p-2 align-top font-normal">
                          <div className="flex items-center gap-1">
                            <Input
                              value={opt.label}
                              onChange={(e) => patchOption(i, { label: e.target.value })}
                              placeholder={`Column ${i + 1}`}
                              aria-label={`Column ${i + 1} label`}
                              maxLength={100}
                              className="h-8 font-semibold bg-background"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Column ${i + 1} actions`}>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled={i === 0} onSelect={() => moveOption(i, i - 1)}>
                                  <ArrowLeft className="size-4" /> Move left
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={i === options.length - 1} onSelect={() => moveOption(i, i + 1)}>
                                  <ArrowRight className="size-4" /> Move right
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => removeOption(i)}>
                                  <Trash2 className="size-4" /> Delete column
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="relative mt-1.5">
                            <Link2 className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                            <Input
                              value={opt.linkSlug}
                              onChange={(e) => patchOption(i, { linkSlug: e.target.value })}
                              placeholder="Link to service slug"
                              aria-label={`Column ${i + 1} service link slug`}
                              maxLength={200}
                              className="h-7 pl-6 text-xs font-mono bg-background"
                            />
                          </div>
                        </th>
                      ))}
                      <th className="w-12 bg-muted/60 border-b border-border/60 p-2 align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Add column"
                          title="Add column"
                          onClick={addOption}
                          disabled={options.length >= COMPARISON_LIMITS.maxOptions}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((row, r) => (
                      <tr key={row.key}>
                        <th scope="row" className="sticky left-0 z-10 bg-background border-b border-r border-border/60 p-2 align-top font-normal">
                          <div className="flex items-start gap-1">
                            <Textarea
                              value={row.label}
                              onChange={(e) => patchCriterion(r, { label: e.target.value })}
                              placeholder={`Row ${r + 1}`}
                              aria-label={`Row ${r + 1} label`}
                              maxLength={200}
                              className="min-h-9 py-1.5 text-sm font-medium"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Row ${r + 1} actions`}>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem disabled={r === 0} onSelect={() => setCriteria((c) => move(c, r, r - 1))}>
                                  <ArrowUp className="size-4" /> Move up
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={r === criteria.length - 1} onSelect={() => setCriteria((c) => move(c, r, r + 1))}>
                                  <ArrowDown className="size-4" /> Move down
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setCriteria((c) => c.filter((_, idx) => idx !== r))}>
                                  <Trash2 className="size-4" /> Delete row
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </th>
                        {options.map((opt, c) => (
                          <td key={opt.key} className="border-b border-r border-border/60 p-1 align-top">
                            <Textarea
                              value={row.values[c] ?? ""}
                              onChange={(e) => setCell(r, c, e.target.value)}
                              aria-label={`${row.label || `Row ${r + 1}`} — ${opt.label || `Column ${c + 1}`}`}
                              maxLength={2000}
                              className="min-h-14 py-1.5 text-sm border-transparent bg-transparent shadow-none hover:bg-muted/30 focus-visible:bg-background"
                            />
                          </td>
                        ))}
                        <td className="border-b border-border/60" />
                      </tr>
                    ))}
                    {criteria.length === 0 && (
                      <tr>
                        <td colSpan={options.length + 2} className="p-6 text-center text-xs text-muted-foreground">
                          No rows yet. Add one, for example &ldquo;Minimum members&rdquo;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {options.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 border-dashed text-xs gap-1.5 text-muted-foreground"
                onClick={addCriterion}
                disabled={criteria.length >= COMPARISON_LIMITS.maxCriteria}
              >
                <Plus className="size-3.5" /> Add row
              </Button>
            )}
            {gridError && <p className="text-xs text-destructive">{gridError}</p>}
          </section>
        </div>

        {/* ── Side column ─────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className={panel}>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="cmp-published" className="text-sm font-semibold">
                  {fields.published ? "Published" : "Draft"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {fields.published ? "Live on the public API." : "Hidden from the public API."}
                </p>
              </div>
              <Switch
                id="cmp-published"
                checked={fields.published}
                onCheckedChange={(v) => setField("published", v)}
                aria-label="Published"
              />
            </div>
            {err("published")}
            <ul className="space-y-1.5 border-t border-border/60 pt-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-xs">
                  {item.ok ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CircleDashed className="size-3.5 text-muted-foreground" />
                  )}
                  <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </li>
              ))}
            </ul>
            {!ready && fields.published && (
              <p className="text-xs text-destructive">Finish the checklist before publishing.</p>
            )}
          </section>

          <section className={panel}>
            <h2 className="text-sm font-semibold text-foreground">Search and links</h2>
            <div className="space-y-1.5">
              <Label htmlFor="cmp-seo-title" className={sectionLabel}>SEO title</Label>
              <Input
                id="cmp-seo-title"
                value={fields.seoTitle}
                onChange={(e) => setField("seoTitle", e.target.value)}
                placeholder="Defaults to the title"
                maxLength={200}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmp-seo-description" className={sectionLabel}>SEO description</Label>
              <Textarea
                id="cmp-seo-description"
                value={fields.seoDescription}
                onChange={(e) => setField("seoDescription", e.target.value)}
                maxLength={500}
                className="min-h-20 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmp-services" className={sectionLabel}>Related services</Label>
              <Input
                id="cmp-services"
                value={serviceDraft}
                onChange={(e) => setServiceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addServiceSlugs(serviceDraft)
                  } else if (e.key === "Backspace" && !serviceDraft && serviceSlugs.length > 0) {
                    setServiceSlugs((s) => s.slice(0, -1))
                  }
                }}
                onBlur={() => addServiceSlugs(serviceDraft)}
                placeholder="Service slug, then Enter"
                className="h-9 text-sm font-mono"
              />
              {serviceSlugs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {serviceSlugs.map((slug) => (
                    <Badge key={slug} variant="secondary" className="gap-1 pr-1 font-mono">
                      {slug}
                      <button
                        type="button"
                        aria-label={`Remove ${slug}`}
                        className="rounded-full p-0.5 hover:bg-foreground/10"
                        onClick={() => setServiceSlugs((s) => s.filter((x) => x !== slug))}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-20 -mx-1 rounded-t-xl border-t border-border/60 bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground truncate">
            {dirty ? "Unsaved changes" : comparisonId ? "All changes saved" : ""}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="ghost" onClick={leave} disabled={saving}>
              {dirty ? "Cancel" : "Back"}
            </Button>
            <Button type="submit" disabled={saving || (!dirty && !!comparisonId)} className="gap-2 font-semibold">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {comparisonId ? "Save changes" : "Create comparison"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits to this comparison have not been saved and will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => router.push("/dashboard/comparisons")}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
