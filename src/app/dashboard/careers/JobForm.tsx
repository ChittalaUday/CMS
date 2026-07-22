"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Check,
  Loader2,
  AlertCircle,
  Undo2Icon,
  PencilIcon,
} from "lucide-react"
import {
  createJobPosting,
  updateJobPosting,
  updateJobStatus,
  discardDraft,
  publishDraft,
  getCareerDepartments,
  getCareerLocations,
  createCareerDepartment,
  createCareerLocation,
  getCareersConfig,
  type JobPostingInput,
  type QuestionInput,
} from "./actions"

// --- Constants ---

import { JobFormStep1 } from "./job-form/JobFormStep1"
import { JobFormStep2 } from "./job-form/JobFormStep2"
import { JobFormStep3 } from "./job-form/JobFormStep3"
import { JobFormStep4 } from "./job-form/JobFormStep4"
import { JobFormFooter } from "./job-form/JobFormFooter"
import { BasicDetails, DescriptionDetails, QuestionDraft, ExistingJob, QuestionType, JobType, SalaryMode, Step } from "./job-form/types"

export interface JobFormProps { job?: ExistingJob }
export type { ExistingJob }
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const slugEditedRef = useRef(false)

  const [departments, setDepartments] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [isDeptsLoading, setIsDeptsLoading] = useState(true)
  const [isLocsLoading, setIsLocsLoading] = useState(true)

  const [isAddingDept, setIsAddingDept] = useState(false)
  const [newDeptName, setNewDeptName] = useState("")
  const [isSubmittingDept, setIsSubmittingDept] = useState(false)

  const [includeTemplate, setIncludeTemplate] = useState(!job?.keywords?.includes("__exclude-global-template__"))
  const [globalTemplateConfig, setGlobalTemplateConfig] = useState<any>(null)

  const [isAddingLoc, setIsAddingLoc] = useState(false)
  const [newLocName, setNewLocName] = useState("")
  const [isSubmittingLoc, setIsSubmittingLoc] = useState(false)

  useEffect(() => {
    getCareersConfig().then(cfg => {
      setGlobalTemplateConfig(cfg)
    }).catch(err => console.error(err))
  }, [])

  useEffect(() => {
    async function loadDepts() {
      try {
        const depts = await getCareerDepartments()
        const names = depts.map(d => d.name)
        if (job?.department && !names.includes(job.department)) {
          names.push(job.department)
        }
        setDepartments(names.sort())
      } catch (err) {
        console.error("Failed to load departments", err)
      } finally {
        setIsDeptsLoading(false)
      }
    }
    async function loadLocs() {
      try {
        const locs = await getCareerLocations()
        const names = locs.map(l => l.name)
        if (job?.location && !names.includes(job.location)) {
          names.push(job.location)
        }
        setLocations(names.sort())
      } catch (err) {
        console.error("Failed to load locations", err)
      } finally {
        setIsLocsLoading(false)
      }
    }
    loadDepts()
    loadLocs()
  }, [job])

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return
    setIsSubmittingDept(true)
    try {
      const res = await createCareerDepartment(newDeptName)
      if (res && 'name' in res) {
        setDepartments(prev => {
          const updated = [...prev, res.name];
          return Array.from(new Set(updated)).sort();
        })
        setBasic(b => ({ ...b, department: res.name }))
        setNewDeptName("")
        setIsAddingDept(false)
        toast.success("Department added successfully")
      } else {
        toast.error("Failed to add department")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add department")
    } finally {
      setIsSubmittingDept(false)
    }
  }

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return
    setIsSubmittingLoc(true)
    try {
      const res = await createCareerLocation(newLocName)
      if (res && 'name' in res) {
        setLocations(prev => {
          const updated = [...prev, res.name];
          return Array.from(new Set(updated)).sort();
        })
        setBasic(b => ({ ...b, location: res.name }))
        setNewLocName("")
        setIsAddingLoc(false)
        toast.success("Location added successfully")
      } else {
        toast.error("Failed to add location")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add location")
    } finally {
      setIsSubmittingLoc(false)
    }
  }

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
    requiredExperience: job?.requiredExperience?.toString() ?? "",
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

  // --- Step 3: Default fields & custom questions state ---
  const [showResume, setShowResume] = useState(() => {
    if (!job) return true
    return job.questions.some((q: any) => q.question.toLowerCase().includes("resume") || q.question.toLowerCase().includes("cv"))
  })
  const [requireResume, setRequireResume] = useState(() => {
    if (!job) return true
    const q = job.questions.find((q: any) => q.question.toLowerCase().includes("resume") || q.question.toLowerCase().includes("cv"))
    return q ? q.required : true
  })
  const [showCoverLetter, setShowCoverLetter] = useState(() => {
    if (!job) return false
    return job.questions.some((q: any) => q.question.toLowerCase().includes("cover letter"))
  })
  const [requireCoverLetter, setRequireCoverLetter] = useState(() => {
    if (!job) return false
    const q = job.questions.find((q: any) => q.question.toLowerCase().includes("cover letter"))
    return q ? q.required : false
  })

  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    if (!job) return []
    const screening = job.questions.filter((q: any) => {
      const lower = q.question.toLowerCase()
      return !lower.includes("resume") && !lower.includes("cv") && !lower.includes("cover letter")
    })
    return screening.map((q) => ({
      tempId: q.id,
      question: q.question,
      type: q.type,
      required: q.required,
      order: q.order,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      newOption: "",
    }))
  })

  // --- Keywords state ---
  const [keywords, setKeywords] = useState<string[]>(job?.keywords ?? [])
  const [newKeyword, setNewKeyword] = useState("")
  const [isRegeneratingKeywords, setIsRegeneratingKeywords] = useState(false)
  const [deleteKwConfirmOpen, setDeleteKwConfirmOpen] = useState(false)
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false)
  const [kwToDelete, setKwToDelete] = useState<string | null>(null)

  const handleKeywordDeleteClick = (kw: string) => {
    setKwToDelete(kw)
    setDeleteKwConfirmOpen(true)
  }

  const handleKeywordDeleteConfirm = () => {
    if (kwToDelete) {
      setKeywords(prev => prev.filter(k => k !== kwToDelete))
      setKwToDelete(null)
    }
  }

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

    const finalQuestions: QuestionInput[] = []
    let orderIdx = 0
    if (showResume) {
      finalQuestions.push({
        question: "Resume / CV",
        type: "FILE",
        required: requireResume,
        order: orderIdx++,
      })
    }
    if (showCoverLetter) {
      finalQuestions.push({
        question: "Cover Letter",
        type: "LONG_TEXT",
        required: requireCoverLetter,
        order: orderIdx++,
      })
    }
    questions.forEach((q) => {
      finalQuestions.push({
        question: q.question || "—",
        type: q.type,
        required: q.required,
        order: orderIdx++,
        options: (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") ? q.options : undefined,
      })
    })

    let finalKeywords = [...keywords]
    if (!includeTemplate && !finalKeywords.includes("__exclude-global-template__")) {
      finalKeywords.push("__exclude-global-template__")
    } else if (includeTemplate) {
      finalKeywords = finalKeywords.filter(k => k !== "__exclude-global-template__")
    }

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
      requiredExperience: basic.requiredExperience || null,
      currency: "INR",
      closingDate: basic.closingDate || null,
      questions: finalQuestions,
      keywords: finalKeywords,
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
    if (basic.requiredExperience.trim()) {
      const experienceRegex = /^\d+(?:\s*(?:-|to)\s*\d+)?\s*\+?(?:\s*(?:years?|yrs?))?$/i
      if (!experienceRegex.test(basic.requiredExperience.trim())) {
        errs.requiredExperience = "Experience must be a number (e.g. 3), range (e.g. 2-5), or format like 3+ years."
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
    const seenQuestions = new Set<string>()

    questions.forEach((q, i) => {
      const trimmedQ = q.question.trim()
      if (!trimmedQ) {
        errs[`q_${i}`] = "Question text is required."
      } else {
        const lowerQ = trimmedQ.toLowerCase()
        if (lowerQ === "resume" || lowerQ === "resume / cv" || lowerQ === "cover letter" || lowerQ === "name" || lowerQ === "email" || lowerQ === "phone") {
          errs[`q_${i}`] = "This is a reserved default field name."
        } else if (seenQuestions.has(lowerQ)) {
          errs[`q_${i}`] = "This exact question has already been added."
        }
        seenQuestions.add(lowerQ)
      }

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
    if (valid) setStep((s: Step) => Math.min(4, s + 1) as Step)
  }

  function goBack() {
    setErrors({})
    setStep((s: Step) => Math.max(1, s - 1) as Step)
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

  function moveOption(tempId: string, optIdx: number, dir: -1 | 1) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q
        const swapIdx = optIdx + dir
        if (swapIdx < 0 || swapIdx >= q.options.length) return q
        const nextOpts = [...q.options]
        ;[nextOpts[optIdx], nextOpts[swapIdx]] = [nextOpts[swapIdx], nextOpts[optIdx]]
        return { ...q, options: nextOpts }
      })
    )
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
    if (isEdit && job?.status === "PUBLISHED") {
      setUnpublishConfirmOpen(true)
      return
    }
    executeSaveDraft()
  }

  function executeSaveDraft() {
    startTransition(async () => {
      setIsSavingDraft(true)
      const toastId = toast.loading("Saving draft…")
      try {
        const payload = buildPayload()
        if (isEdit && job) {
          await updateJobPosting(job.id, payload)
          if (job.status === "PUBLISHED") {
            await updateJobStatus(job.id, "DRAFT")
            toast.success("Job posting unpublished and saved as draft.", { id: toastId })
            router.push("/dashboard/careers")
            return
          }
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
  function handleSubmit(targetStatus: "DRAFT" | "PUBLISHED") {
    if (!validateStep3()) return

    startTransition(async () => {
      const toastId = toast.loading("Saving…")
      try {
        const payload = buildPayload()
        const isPublishing = targetStatus === "PUBLISHED"

        if (isEdit && job) {
          if (isDraft && isPublishing) {
            await updateJobPosting(job.id, payload)
            await publishDraft(job.id)
            toast.success("Job posting published!", { id: toastId })
          } else {
            await updateJobPosting(job.id, payload)
            if (job.status !== targetStatus) {
              await updateJobStatus(job.id, targetStatus)
            }
            toast.success(isPublishing ? "Job posting published!" : "Changes saved.", { id: toastId })
          }
        } else {
          const created = await createJobPosting(payload)
          if (isPublishing && created?.id) {
            await updateJobStatus(created.id, "PUBLISHED")
          }
          toast.success(isPublishing ? "Job posting published!" : "Draft saved.", { id: toastId })
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

      
      {step === 1 && (
        <JobFormStep1
          basic={basic}
          setBasic={setBasic}
          errors={errors}
          setErrors={setErrors}
          isEdit={isEdit}
          slugEditedRef={slugEditedRef}
          toSlug={toSlug}
          departments={departments}
          isDeptsLoading={isDeptsLoading}
          setIsAddingDept={setIsAddingDept}
          locations={locations}
          isLocsLoading={isLocsLoading}
          setIsAddingLoc={setIsAddingLoc}
        />
      )}

      {step === 2 && (
        <JobFormStep2
          desc={desc}
          setDesc={setDesc}
          errors={errors}
          setErrors={setErrors}
          includeTemplate={includeTemplate}
          setIncludeTemplate={setIncludeTemplate}
          globalTemplateConfig={globalTemplateConfig}
        />
      )}

      {step === 3 && (
        <JobFormStep3
          questions={questions}
          setQuestions={setQuestions}
          errors={errors}
          setErrors={setErrors}
          showResume={showResume}
          setShowResume={setShowResume}
          requireResume={requireResume}
          setRequireResume={setRequireResume}
          showCoverLetter={showCoverLetter}
          setShowCoverLetter={setShowCoverLetter}
          requireCoverLetter={requireCoverLetter}
          setRequireCoverLetter={setRequireCoverLetter}
          addQuestion={addQuestion}
          removeQuestion={removeQuestion}
          moveQuestion={moveQuestion}
          updateQuestion={updateQuestion}
          addOption={addOption}
          removeOption={removeOption}
          moveOption={moveOption}
        />
      )}

      {step === 4 && (
        <JobFormStep4
          basic={basic}
          desc={desc}
          questions={questions}
          keywords={keywords}
          setKeywords={setKeywords}
          setErrors={setErrors}
          setStep={setStep}
          handleKeywordDeleteClick={handleKeywordDeleteClick}
          isRegeneratingKeywords={isRegeneratingKeywords}
          setIsRegeneratingKeywords={setIsRegeneratingKeywords}
        />
      )}

      <JobFormFooter
        step={step}
        isEdit={isEdit}
        jobStatus={job?.status}
        isPending={isPending}
        isSavingDraft={isSavingDraft}
        handleSaveDraft={handleSaveDraft}
        handleSubmit={handleSubmit}
        goBack={goBack}
        goNext={goNext}
        onCancel={() => router.push("/dashboard/careers")}
      />

      {/* Add Department Dialog */}
      <Dialog open={isAddingDept} onOpenChange={setIsAddingDept}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-dept-name">Department Name</Label>
              <Input
                id="new-dept-name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Sales"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddDepartment()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingDept(false)} disabled={isSubmittingDept}>
              Cancel
            </Button>
            <Button onClick={handleAddDepartment} disabled={isSubmittingDept || !newDeptName.trim()}>
              {isSubmittingDept ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={isAddingLoc} onOpenChange={setIsAddingLoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-loc-name">Location Name</Label>
              <Input
                id="new-loc-name"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Bangalore, IN"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddLocation()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingLoc(false)} disabled={isSubmittingLoc}>
              Cancel
            </Button>
            <Button onClick={handleAddLocation} disabled={isSubmittingLoc || !newLocName.trim()}>
              {isSubmittingLoc ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
