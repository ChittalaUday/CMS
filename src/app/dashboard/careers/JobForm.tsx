"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Loader2,
  Briefcase,
  MapPin,
  IndianRupeeIcon,
  Calendar,
  Building2,
  ListChecks,
  AlertCircle,
  FileText,
  SaveIcon,
  Undo2Icon,
  AlertTriangleIcon,
  PencilIcon,
  Paperclip,
} from "lucide-react"
import { RichTextEditor } from "@/components/RichTextEditor"
import {
  createJobPosting,
  updateJobPosting,
  updateJobStatus,
  discardDraft,
  publishDraft,
  type JobPostingInput,
  type QuestionInput,
} from "./actions"

// --- Types ---

type Step = 1 | 2 | 3 | 4

type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY"
type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "YES_NO" | "FILE"
type SalaryMode = "none" | "single" | "range"

interface BasicDetails {
  title: string
  slug: string
  department: string
  location: string
  jobType: JobType
  salaryMode: SalaryMode
  salaryValue: string
  salaryMin: string
  salaryMax: string
  closingDate: string
}

interface DescriptionDetails {
  description: string
  descriptionJson: unknown
  responsibilities: string
  responsibilitiesJson: unknown
  requirements: string
  requirementsJson: unknown
}

interface QuestionDraft {
  tempId: string
  question: string
  type: QuestionType
  required: boolean
  order: number
  options: string[]
  newOption: string
}

export interface ExistingJob {
  id: string
  title: string
  slug: string
  department: string
  location: string
  jobType: JobType
  description: string
  descriptionJson: unknown
  responsibilities: string | null
  responsibilitiesJson: unknown
  requirements: string | null
  requirementsJson: unknown
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  closingDate: Date | null
  status: "DRAFT" | "PUBLISHED" | "CLOSED"
  draftParentId: string | null
  draftParent: { id: string; title: string; status: string } | null
  questions: {
    id: string
    question: string
    type: QuestionType
    required: boolean
    order: number
    options: unknown
  }[]
}

interface JobFormProps {
  job?: ExistingJob
}

// --- Constants ---

const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short Answer",
  LONG_TEXT: "Long Answer",
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  YES_NO: "Yes / No",
  FILE: "File Upload",
}

// --- Helpers ---

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
}

function inferSalaryMode(min: number | null, max: number | null): SalaryMode {
  if (!min && !max) return "none"
  if (min && max && min !== max) return "range"
  return "single"
}

// --- Sub-components ---

function StepIndicator({ current }: { current: Step }) {
  const steps = [{ label: "Basics" }, { label: "Description" }, { label: "Questions" }, { label: "Review" }]
  return (
    <div className="flex items-start gap-0 w-full mb-8">
      {steps.map((step, i) => {
        const n = (i + 1) as Step
        const isCompleted = n < current
        const isActive = n === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 ${
                isCompleted ? "bg-primary border-primary text-primary-foreground"
                : isActive ? "border-primary text-primary bg-primary/10"
                : "border-border/60 text-muted-foreground bg-muted/30"
              }`}>
                {isCompleted ? <Check className="size-3.5" /> : n}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:block transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mb-3 mx-2 rounded-full transition-all duration-300 ${n < current ? "bg-primary" : "bg-border/40"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

// --- Main Component ---

export function JobForm({ job }: JobFormProps) {
  const router = useRouter()
  const isEdit = !!job
  const isDraft = job?.status === "DRAFT"
  const hasParent = !!job?.draftParentId
  const [isPending, startTransition] = useTransition()
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [publishNow, setPublishNow] = useState(job?.status === "PUBLISHED")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const slugEditedRef = useRef(false)

  // --- Step 1 state ---
  const initialSalaryMode = inferSalaryMode(job?.salaryMin ?? null, job?.salaryMax ?? null)
  const [basic, setBasic] = useState<BasicDetails>({
    title: job?.title ?? "",
    slug: job?.slug ?? "",
    department: job?.department ?? "",
    location: job?.location ?? "",
    jobType: job?.jobType ?? "FULL_TIME",
    salaryMode: initialSalaryMode,
    salaryValue: initialSalaryMode === "single" ? (job?.salaryMin?.toString() ?? "") : "",
    salaryMin: initialSalaryMode === "range" ? (job?.salaryMin?.toString() ?? "") : "",
    salaryMax: initialSalaryMode === "range" ? (job?.salaryMax?.toString() ?? "") : "",
    closingDate: job?.closingDate ? new Date(job.closingDate).toISOString().split("T")[0] : "",
  })

  // --- Step 2 state ---
  const [desc, setDesc] = useState<DescriptionDetails>({
    description: job?.description ?? "",
    descriptionJson: job?.descriptionJson ?? null,
    responsibilities: job?.responsibilities ?? "",
    responsibilitiesJson: job?.responsibilitiesJson ?? null,
    requirements: job?.requirements ?? "",
    requirementsJson: job?.requirementsJson ?? null,
  })

  // --- Step 3 state ---
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    if (!job?.questions?.length) return []
    return job.questions.map((q) => ({
      tempId: q.id,
      question: q.question,
      type: q.type,
      required: q.required,
      order: q.order,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      newOption: "",
    }))
  })

  // --- Salary helpers ---
  function getSalaryPayload(): { salaryMin: number | null; salaryMax: number | null } {
    if (basic.salaryMode === "none") return { salaryMin: null, salaryMax: null }
    if (basic.salaryMode === "single") {
      const v = Number(basic.salaryValue) || null
      return { salaryMin: v, salaryMax: null }
    }
    return {
      salaryMin: Number(basic.salaryMin) || null,
      salaryMax: Number(basic.salaryMax) || null,
    }
  }

  // --- Payload builder ---
  function buildPayload(): JobPostingInput {
    const salary = getSalaryPayload()
    return {
      title: basic.title || "Untitled",
      slug: basic.slug || toSlug(basic.title || "untitled"),
      department: basic.department || "—",
      location: basic.location || "—",
      jobType: basic.jobType,
      description: desc.description,
      descriptionJson: desc.descriptionJson as JobPostingInput["descriptionJson"],
      responsibilities: desc.responsibilities || undefined,
      responsibilitiesJson: desc.responsibilitiesJson as JobPostingInput["responsibilitiesJson"],
      requirements: desc.requirements || undefined,
      requirementsJson: desc.requirementsJson as JobPostingInput["requirementsJson"],
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      currency: "INR",
      closingDate: basic.closingDate || null,
      questions: questions.map((q, i) => ({
        question: q.question || "—",
        type: q.type,
        required: q.required,
        order: i,
        options: (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") ? q.options : undefined,
      })) as QuestionInput[],
    }
  }

  // --- Validation ---

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!basic.title.trim()) errs.title = "Job title is required."
    if (!basic.slug.trim()) errs.slug = "URL slug is required."
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(basic.slug)) {
      errs.slug = "Slug must contain only lowercase letters, numbers, and hyphens."
    }
    if (!basic.department.trim()) errs.department = "Department is required."
    if (!basic.location.trim()) errs.location = "Location is required."
    if (basic.salaryMode === "range" && basic.salaryMin && basic.salaryMax) {
      if (Number(basic.salaryMin) > Number(basic.salaryMax)) {
        errs.salaryMin = "Minimum salary cannot exceed maximum."
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {}
    if (!desc.description.trim() || desc.description.trim() === "<p></p>") {
      errs.description = "Job description is required."
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep3(): boolean {
    const errs: Record<string, string> = {}
    questions.forEach((q, i) => {
      if (!q.question.trim()) errs[`q_${i}`] = "Question text is required."
      if ((q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && q.options.length < 2) {
        errs[`q_opts_${i}`] = "Please add at least 2 options."
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // --- Navigation ---

  function goNext() {
    const valid =
      step === 1 ? validateStep1() :
      step === 2 ? validateStep2() :
      step === 3 ? validateStep3() : true
    if (valid) setStep((s) => Math.min(4, s + 1) as Step)
  }

  function goBack() {
    setErrors({})
    setStep((s) => Math.max(1, s - 1) as Step)
  }

  // --- Question helpers ---

  function addQuestion() {
    const tempId = `tmp_${questions.length}_${Date.now()}`
    setQuestions((prev) => [...prev, { tempId, question: "", type: "SHORT_TEXT", required: false, order: prev.length, options: [], newOption: "" }])
  }

  function removeQuestion(tempId: string) {
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId).map((q, i) => ({ ...q, order: i })))
  }

  function moveQuestion(tempId: string, dir: "up" | "down") {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.tempId === tempId)
      if (idx < 0) return prev
      const swapIdx = dir === "up" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next.map((q, i) => ({ ...q, order: i }))
    })
  }

  function updateQuestion(tempId: string, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q)))
  }

  function addOption(tempId: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId || !q.newOption.trim()) return q
        if (q.options.includes(q.newOption.trim())) return { ...q, newOption: "" }
        return { ...q, options: [...q.options, q.newOption.trim()], newOption: "" }
      })
    )
  }

  function removeOption(tempId: string, opt: string) {
    setQuestions((prev) =>
      prev.map((q) => q.tempId === tempId ? { ...q, options: q.options.filter((o) => o !== opt) } : q)
    )
  }

  // --- Save Draft (any time) ---
  function handleSaveDraft() {
    if (!basic.title.trim()) {
      toast.error("Please enter a job title before saving as draft.")
      return
    }
    startTransition(async () => {
      setIsSavingDraft(true)
      const toastId = toast.loading("Saving draft…")
      try {
        const payload = buildPayload()
        if (isEdit && job) {
          await updateJobPosting(job.id, payload)
          toast.success("Draft saved.", { id: toastId })
        } else {
          const created = await createJobPosting(payload)
          toast.success("Draft saved.", { id: toastId })
          if (created?.id) {
            router.replace(`/dashboard/careers/${created.id}/edit`)
            return
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save draft.", { id: toastId })
      } finally {
        setIsSavingDraft(false)
      }
    })
  }

  // --- Discard Draft ---
  function handleDiscardDraft() {
    if (!job?.id) return
    startTransition(async () => {
      setIsDiscarding(true)
      const toastId = toast.loading("Discarding draft…")
      try {
        const result = await discardDraft(job.id)
        toast.success("Draft discarded.", { id: toastId })
        router.push(result.parentId ? `/dashboard/careers/${result.parentId}/edit` : "/dashboard/careers")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to discard draft.", { id: toastId })
        setIsDiscarding(false)
      }
    })
  }

  // --- Final Submit (Publish / Save) ---
  function handleSubmit() {
    if (!validateStep3()) return

    startTransition(async () => {
      const toastId = toast.loading("Saving…")
      try {
        const payload = buildPayload()

        if (isEdit && job) {
          if (isDraft && publishNow) {
            await updateJobPosting(job.id, payload)
            await publishDraft(job.id)
            toast.success("Job posting published!", { id: toastId })
          } else {
            await updateJobPosting(job.id, payload)
            const targetStatus = publishNow ? "PUBLISHED" : "DRAFT"
            if (job.status !== targetStatus) {
              await updateJobStatus(job.id, targetStatus)
            }
            toast.success(publishNow ? "Job posting published!" : "Changes saved.", { id: toastId })
          }
        } else {
          const created = await createJobPosting(payload)
          if (publishNow && created?.id) {
            await updateJobStatus(created.id, "PUBLISHED")
          }
          toast.success(publishNow ? "Job posting published!" : "Draft saved.", { id: toastId })
        }

        router.push("/dashboard/careers")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An unexpected error occurred.", { id: toastId })
      }
    })
  }

  // --- Render ---

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Draft banner */}
      {isDraft && hasParent && job.draftParent && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3.5 flex items-center gap-3">
          <PencilIcon className="size-4 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Working Draft</p>
            <p className="text-xs text-muted-foreground">
              Editing a draft of <span className="font-medium text-foreground">{job.draftParent.title}</span>.
              The published version remains live until you publish this draft.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
            onClick={handleDiscardDraft}
            disabled={isPending || isDiscarding}
          >
            {isDiscarding ? <Loader2 className="size-3 animate-spin mr-1" /> : <Undo2Icon className="size-3 mr-1" />}
            Discard Draft
          </Button>
        </div>
      )}

      <StepIndicator current={step} />

      {/* ── Step 1: Basic Details ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1 pb-3 border-b border-border/60">
            <h2 className="text-xl font-bold">Basic Details</h2>
            <p className="text-sm text-muted-foreground">Essential information about the position.</p>
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Job Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={basic.title}
              onChange={(e) => {
                const title = e.target.value
                setBasic((b) => ({
                  ...b,
                  title,
                  slug: isEdit || slugEditedRef.current ? b.slug : toSlug(title),
                }))
                if (errors.title) setErrors((e) => ({ ...e, title: "" }))
              }}
              placeholder="e.g. Senior Frontend Engineer"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
            <FieldError message={errors.title} />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              URL Slug <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center rounded-md border border-border/80 bg-muted/30 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
              <span className="px-3 text-xs text-muted-foreground font-mono border-r border-border/60 h-9 flex items-center bg-muted/50 shrink-0">
                /careers/
              </span>
              <input
                id="slug"
                type="text"
                value={basic.slug}
                onChange={(e) => {
                  slugEditedRef.current = true
                  setBasic((b) => ({ ...b, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
                  if (errors.slug) setErrors((e) => ({ ...e, slug: "" }))
                }}
                placeholder="senior-frontend-engineer"
                className="flex-1 h-9 px-3 text-sm font-mono bg-transparent outline-none"
              />
            </div>
            <FieldError message={errors.slug} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="dept" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Department <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dept"
                value={basic.department}
                onChange={(e) => {
                  setBasic((b) => ({ ...b, department: e.target.value }))
                  if (errors.department) setErrors((e) => ({ ...e, department: "" }))
                }}
                placeholder="e.g. Engineering"
                className="h-9 bg-muted/30 border-border/80 text-sm"
              />
              <FieldError message={errors.department} />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Location <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                value={basic.location}
                onChange={(e) => {
                  setBasic((b) => ({ ...b, location: e.target.value }))
                  if (errors.location) setErrors((e) => ({ ...e, location: "" }))
                }}
                placeholder="e.g. Remote / Hyderabad, IN"
                className="h-9 bg-muted/30 border-border/80 text-sm"
              />
              <FieldError message={errors.location} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Job Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Job Type <span className="text-destructive">*</span>
              </Label>
              <Select value={basic.jobType} onValueChange={(v) => setBasic((b) => ({ ...b, jobType: v as JobType }))}>
                <SelectTrigger className="h-9 bg-muted/30 border-border/80 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Closing Date */}
            <div className="space-y-2">
              <Label htmlFor="closingDate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Closing Date <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </Label>
              <Input
                id="closingDate"
                type="date"
                value={basic.closingDate}
                onChange={(e) => setBasic((b) => ({ ...b, closingDate: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                className="h-9 bg-muted/30 border-border/80 text-sm"
              />
            </div>
          </div>

          {/* Salary — INR only */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupeeIcon className="size-3" />
                Salary <span className="text-muted-foreground/60 font-normal normal-case">(optional, INR)</span>
              </Label>
              {/* Mode selector */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/60">
                {(["none", "single", "range"] as SalaryMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBasic((b) => ({ ...b, salaryMode: mode }))}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      basic.salaryMode === mode
                        ? "bg-background text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "none" ? "Not specified" : mode === "single" ? "Fixed" : "Range"}
                  </button>
                ))}
              </div>
            </div>

            {basic.salaryMode === "single" && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground shrink-0">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={basic.salaryValue}
                  onChange={(e) => setBasic((b) => ({ ...b, salaryValue: e.target.value }))}
                  placeholder="e.g. 1200000"
                  className="h-9 bg-muted/30 border-border/80 text-sm max-w-xs"
                />
                <span className="text-xs text-muted-foreground">per year</span>
              </div>
            )}

            {basic.salaryMode === "range" && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground shrink-0">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={basic.salaryMin}
                  onChange={(e) => {
                    setBasic((b) => ({ ...b, salaryMin: e.target.value }))
                    if (errors.salaryMin) setErrors((e) => ({ ...e, salaryMin: "" }))
                  }}
                  placeholder="Min"
                  className="h-9 bg-muted/30 border-border/80 text-sm"
                />
                <span className="text-muted-foreground text-sm shrink-0">–</span>
                <Input
                  type="number"
                  min={0}
                  value={basic.salaryMax}
                  onChange={(e) => setBasic((b) => ({ ...b, salaryMax: e.target.value }))}
                  placeholder="Max"
                  className="h-9 bg-muted/30 border-border/80 text-sm"
                />
                <span className="text-xs text-muted-foreground shrink-0">per year</span>
              </div>
            )}
            <FieldError message={errors.salaryMin} />
          </div>
        </div>
      )}

      {/* ── Step 2: Job Description ───────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1 pb-3 border-b border-border/60">
            <h2 className="text-xl font-bold">Job Description</h2>
            <p className="text-sm text-muted-foreground">
              Use the rich text editor for formatting — bullet points, headings, bold text, etc.
            </p>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Job Description <span className="text-destructive">*</span>
            </Label>
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <RichTextEditor
                content={desc.description}
                contentJson={desc.descriptionJson}
                onChange={(html, json) => {
                  setDesc((d) => ({ ...d, description: html, descriptionJson: json }))
                  if (errors.description) setErrors((e) => ({ ...e, description: "" }))
                }}
              />
            </div>
            <FieldError message={errors.description} />
          </div>

          {/* Roles & Responsibilities */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roles & Responsibilities <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
            </Label>
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <RichTextEditor
                content={desc.responsibilities}
                contentJson={desc.responsibilitiesJson}
                onChange={(html, json) =>
                  setDesc((d) => ({ ...d, responsibilities: html, responsibilitiesJson: json }))
                }
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Requirements & Qualifications <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
            </Label>
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <RichTextEditor
                content={desc.requirements}
                contentJson={desc.requirementsJson}
                onChange={(html, json) =>
                  setDesc((d) => ({ ...d, requirements: html, requirementsJson: json }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Questionnaire ─────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-1 pb-3 border-b border-border/60">
            <h2 className="text-xl font-bold">Custom Questionnaire</h2>
            <p className="text-sm text-muted-foreground">
              Add screening questions for applicants. Optional — leave empty to skip.
            </p>
          </div>

          {questions.length === 0 ? (
            <div className="min-h-55 rounded-xl border border-dashed border-border/80 bg-muted/10 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <ListChecks className="size-8 text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-sm">No questions yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applicants will only fill in their name, email, and cover letter.
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mt-1" onClick={addQuestion}>
                <Plus className="size-3.5" /> Add First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.tempId} className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                      Q{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={q.question}
                        onChange={(e) => {
                          updateQuestion(q.tempId, { question: e.target.value })
                          if (errors[`q_${i}`]) setErrors((e) => ({ ...e, [`q_${i}`]: "" }))
                        }}
                        placeholder="Enter your question…"
                        className="h-9 bg-muted/30 border-border/80 text-sm"
                      />
                      <FieldError message={errors[`q_${i}`]} />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg hover:bg-muted"
                        disabled={i === 0} onClick={() => moveQuestion(q.tempId, "up")} title="Move up">
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg hover:bg-muted"
                        disabled={i === questions.length - 1} onClick={() => moveQuestion(q.tempId, "down")} title="Move down">
                        <ChevronDown className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg hover:bg-destructive/10 text-destructive"
                        onClick={() => removeQuestion(q.tempId)} title="Remove">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Select
                      value={q.type}
                      onValueChange={(v) => {
                        updateQuestion(q.tempId, { type: v as QuestionType, options: [], newOption: "" })
                        if (errors[`q_opts_${i}`]) setErrors((e) => ({ ...e, [`q_opts_${i}`]: "" }))
                      }}
                    >
                      <SelectTrigger className="h-8 w-44 bg-muted/30 border-border/80 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="text-xs">
                            {val === "FILE" && <Paperclip className="size-3 inline mr-1.5" />}
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Switch id={`req_${q.tempId}`} checked={q.required}
                        onCheckedChange={(v) => updateQuestion(q.tempId, { required: v })} />
                      <Label htmlFor={`req_${q.tempId}`} className="text-xs text-muted-foreground cursor-pointer">
                        Required
                      </Label>
                    </div>

                    {q.type === "FILE" && (
                      <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <Paperclip className="size-3" /> Applicant will upload a file
                      </span>
                    )}
                  </div>

                  {/* Options editor */}
                  {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</Label>
                      <div className="flex flex-wrap gap-1.5 min-h-7">
                        {q.options.length === 0 ? (
                          <span className="text-xs text-muted-foreground/60 italic">No options yet — type below and press Enter</span>
                        ) : (
                          q.options.map((opt) => (
                            <span key={opt} className="inline-flex items-center gap-1 text-xs bg-muted/60 border border-border/60 px-2.5 py-1 rounded-lg">
                              {opt}
                              <button type="button" onClick={() => removeOption(q.tempId, opt)}
                                className="text-muted-foreground/60 hover:text-destructive ml-0.5 leading-none" aria-label={`Remove "${opt}"`}>
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <FieldError message={errors[`q_opts_${i}`]} />
                      <div className="flex gap-2">
                        <Input
                          value={q.newOption}
                          onChange={(e) => updateQuestion(q.tempId, { newOption: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(q.tempId) } }}
                          placeholder="Type an option and press Enter"
                          className="h-8 bg-muted/30 border-border/80 text-xs"
                        />
                        <Button type="button" variant="outline" size="sm"
                          className="h-8 text-xs shrink-0 border-border/60"
                          onClick={() => addOption(q.tempId)} disabled={!q.newOption.trim()}>
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-dashed" onClick={addQuestion}>
                <Plus className="size-3.5" /> Add Question
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Review & Publish ──────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="space-y-1 pb-3 border-b border-border/60">
            <h2 className="text-xl font-bold">Review & Publish</h2>
            <p className="text-sm text-muted-foreground">Review everything before saving. Click any section to edit.</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
            {/* Position overview */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground"
                  onClick={() => { setErrors({}); setStep(1) }}>Edit</Button>
              </div>
              <p className="font-bold text-base leading-snug">{basic.title}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="size-3 shrink-0" />{basic.department}</span>
                <span className="flex items-center gap-1"><MapPin className="size-3 shrink-0" />{basic.location}</span>
                <span className="flex items-center gap-1"><Briefcase className="size-3 shrink-0" />{JOB_TYPE_LABELS[basic.jobType]}</span>
                {basic.salaryMode === "single" && basic.salaryValue && (
                  <span className="flex items-center gap-1">
                    <IndianRupeeIcon className="size-3 shrink-0" />
                    ₹{Number(basic.salaryValue).toLocaleString("en-IN")} p.a.
                  </span>
                )}
                {basic.salaryMode === "range" && basic.salaryMin && (
                  <span className="flex items-center gap-1">
                    <IndianRupeeIcon className="size-3 shrink-0" />
                    ₹{Number(basic.salaryMin).toLocaleString("en-IN")}
                    {basic.salaryMax ? ` – ₹${Number(basic.salaryMax).toLocaleString("en-IN")}` : "+"} p.a.
                  </span>
                )}
                {basic.closingDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 shrink-0" />
                    Closes {new Date(basic.closingDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground/50 mt-1">/careers/{basic.slug}</p>
            </div>

            {/* Description preview */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground"
                  onClick={() => { setErrors({}); setStep(2) }}>Edit</Button>
              </div>
              <div
                className="text-sm text-foreground/80 line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: desc.description }}
              />
              {desc.responsibilities && (
                <>
                  <Separator className="my-2 bg-border/40" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Roles & Responsibilities</p>
                  <div className="text-xs text-muted-foreground line-clamp-2 prose prose-xs dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: desc.responsibilities }} />
                </>
              )}
              {desc.requirements && (
                <>
                  <Separator className="my-2 bg-border/40" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Requirements</p>
                  <div className="text-xs text-muted-foreground line-clamp-2 prose prose-xs dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: desc.requirements }} />
                </>
              )}
            </div>

            {/* Questions summary */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Questionnaire ({questions.length} question{questions.length !== 1 ? "s" : ""})
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground"
                  onClick={() => { setErrors({}); setStep(3) }}>Edit</Button>
              </div>
              {questions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No questions — applicants fill in basic contact details.</p>
              ) : (
                <ul className="space-y-1.5">
                  {questions.map((q, i) => (
                    <li key={q.tempId} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground/50 shrink-0 mt-0.5 font-mono">{i + 1}.</span>
                      <span className="text-foreground/80 flex-1">{q.question}</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 shrink-0 border-border/60">
                        {q.type === "FILE" ? <><Paperclip className="size-2.5 inline mr-0.5" />File</> : QUESTION_TYPE_LABELS[q.type]}
                      </Badge>
                      {q.required && <span className="text-[9px] text-destructive font-bold shrink-0">*</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Publish toggle */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">{publishNow ? "Publish immediately" : "Save as draft"}</p>
              <p className="text-xs text-muted-foreground">
                {publishNow
                  ? "The job will go live and accept applications right away."
                  : "The job will be saved privately. Publish it when you're ready."}
              </p>
            </div>
            <Switch checked={publishNow} onCheckedChange={setPublishNow} />
          </div>
        </div>
      )}

      {/* ── Navigation Footer ─────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Button
          variant="outline"
          onClick={step === 1 ? () => router.push("/dashboard/careers") : goBack}
          className="h-9 text-sm gap-1.5"
          disabled={isPending}
        >
          <ChevronLeft className="size-4" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        <div className="flex items-center gap-2">
          {/* Save Draft — always available */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 border-border/60"
            onClick={handleSaveDraft}
            disabled={isPending || isSavingDraft}
            title="Save current progress as draft"
          >
            {isSavingDraft && isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            Save Draft
          </Button>

          {step < 4 ? (
            <Button onClick={goNext} className="h-9 text-sm gap-1.5 font-semibold shadow-sm" disabled={isPending}>
              Continue <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="h-9 text-sm gap-1.5 font-semibold shadow-sm min-w-35"
              disabled={isPending}
            >
              {isPending && !isSavingDraft ? (
                <><Loader2 className="size-4 animate-spin" />Saving…</>
              ) : publishNow ? (
                <><FileText className="size-4" />{isEdit ? "Save & Publish" : "Publish Job"}</>
              ) : (
                <><FileText className="size-4" />{isEdit ? "Save Changes" : "Save Draft"}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
