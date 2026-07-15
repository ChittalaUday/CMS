"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { submitApplication } from "@/app/dashboard/careers/actions"

interface Question {
  id: string
  question: string
  type: string
  required: boolean
  order: number
  options: unknown
}

interface ApplyFormProps {
  jobId: string
  jobTitle: string
  questions: Question[]
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

export function ApplyForm({ jobId, jobTitle, questions }: ApplyFormProps) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // Detect default fields among questions
  const resumeQuestion = questions.find(q => q.question.toLowerCase().includes("resume") || q.question.toLowerCase().includes("cv"))
  const coverLetterQuestion = questions.find(q => q.question.toLowerCase().includes("cover letter"))
  const customQuestions = questions.filter(q => q.id !== resumeQuestion?.id && q.id !== coverLetterQuestion?.id)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Your name is required."
    else if (!/^[a-zA-Z\s'\-]{2,50}$/.test(name.trim())) {
      errs.name = "Please enter a valid name (letters, spaces, hyphens, and apostrophes only, 2-50 characters)."
    }

    if (!email.trim()) errs.email = "Your email is required."
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      errs.email = "Please enter a valid email address."
    }

    if (!phone.trim()) {
      errs.phone = "Your phone number is required."
    } else {
      const cleanPhone = phone.trim().replace(/[\s\-()]/g, "")
      if (!/^(?:\+?91)?[6-9]\d{9}$/.test(cleanPhone)) {
        errs.phone = "Please enter a valid 10-digit Indian phone number (optionally prefixed with +91)."
      }
    }

    // Validate Resume if configured
    if (resumeQuestion && resumeQuestion.required && !answers[resumeQuestion.id]?.trim()) {
      errs.resume = "Your resume is required."
    }

    // Validate Cover Letter if configured
    if (coverLetterQuestion && coverLetterQuestion.required && !coverLetter.trim()) {
      errs.coverLetter = "Your cover letter is required."
    }

    // Validate Screening Questions
    customQuestions.forEach((q) => {
      if (q.required && !answers[q.id]?.trim()) {
        errs[`q_${q.id}`] = "This question requires an answer."
      }
    })

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    startTransition(async () => {
      try {
        const resolvedResumeUrl = resumeQuestion ? (answers[resumeQuestion.id] ?? "") : ""

        // Append cover letter to answers if configured, so backend required validation succeeds
        const finalAnswers = Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([questionId, answer]) => ({ questionId, answer: answer.trim() }))

        if (coverLetterQuestion && coverLetter.trim()) {
          finalAnswers.push({ questionId: coverLetterQuestion.id, answer: coverLetter.trim() })
        }

        await submitApplication({
          jobId,
          applicantName: name.trim(),
          applicantEmail: email.trim(),
          applicantPhone: phone.trim() || undefined,
          resumeUrl: resolvedResumeUrl.trim() || undefined,
          coverLetter: coverLetterQuestion ? (coverLetter.trim() || undefined) : undefined,
          answers: finalAnswers,
        })
        setSubmitted(true)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        )
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
        <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Application Submitted!</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Thanks for applying for{" "}
            <span className="font-semibold text-foreground">{jobTitle}</span>. We&apos;ll review
            your application and get back to you if there&apos;s a match.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Contact details */}
      <div className="space-y-4">
        <h3 className="text-base font-bold border-b border-border/60 pb-2">
          Your Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((e) => ({ ...e, name: "" }))
              }}
              placeholder="Jane Smith"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((e) => ({ ...e, email: "" }))
              }}
              placeholder="jane@example.com"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
            <FieldError message={errors.email} />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="phone"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (errors.phone) setErrors((e) => ({ ...e, phone: "" }))
            }}
            placeholder="+1 (555) 000-0000"
            className="h-9 bg-muted/30 border-border/80 text-sm"
          />
          <FieldError message={errors.phone} />
        </div>

        {/* Resume upload if enabled */}
        {resumeQuestion && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resume / CV {resumeQuestion.required && <span className="text-destructive">*</span>}
            </Label>
            {answers[resumeQuestion.id] ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40 border-border/80 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-semibold text-primary truncate max-w-[200px]">
                    {answers[resumeQuestion.id].split("/").pop()}
                  </span>
                  <span className="text-muted-foreground text-[10px]">Uploaded</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnswers((a) => {
                    const copy = { ...a }
                    delete copy[resumeQuestion.id]
                    return copy
                  })}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    const formData = new FormData()
                    formData.append("file", file)
                    
                    const toastId = toast.loading(`Uploading ${file.name}...`)
                    try {
                      const { uploadPublicFile } = await import("@/app/dashboard/careers/actions")
                      const res = await uploadPublicFile(formData)
                      setAnswers((a) => ({ ...a, [resumeQuestion.id]: res.url }))
                      if (errors.resume) {
                        setErrors((e) => ({ ...e, resume: "" }))
                      }
                      toast.success("File uploaded successfully", { id: toastId })
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Upload failed", { id: toastId })
                    }
                  }}
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="h-9 px-3 rounded-lg border border-dashed border-border/80 bg-muted/30 text-muted-foreground flex items-center justify-center text-xs font-medium hover:bg-muted/50 transition-colors">
                  Click to upload document (PDF, DOC, DOCX)
                </div>
              </div>
            )}
            <FieldError message={errors.resume} />
          </div>
        )}

        {/* Cover letter if enabled */}
        {coverLetterQuestion && (
          <div className="space-y-2">
            <Label
              htmlFor="cover"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Cover Letter {coverLetterQuestion.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="cover"
              value={coverLetter}
              onChange={(e) => {
                setCoverLetter(e.target.value)
                if (errors.coverLetter) setErrors((e) => ({ ...e, coverLetter: "" }))
              }}
              placeholder="Tell us why you're a great fit for this role…"
              className="min-h-[120px] bg-muted/30 border-border/80 text-sm resize-y"
            />
            <FieldError message={errors.coverLetter} />
          </div>
        )}
      </div>

      {/* Custom questions */}
      {customQuestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold border-b border-border/60 pb-2">
            Screening Questions
          </h3>

          {customQuestions
            .sort((a, b) => a.order - b.order)
            .map((q) => {
              const opts = Array.isArray(q.options) ? (q.options as string[]) : []

              return (
                <div key={q.id} className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {q.question}
                    {q.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>

                  {q.type === "SHORT_TEXT" && (
                    <Input
                      value={answers[q.id] ?? ""}
                      onChange={(e) => {
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        if (errors[`q_${q.id}`])
                          setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                      }}
                      placeholder="Your answer…"
                      className="h-9 bg-muted/30 border-border/80 text-sm"
                    />
                  )}

                  {q.type === "LONG_TEXT" && (
                    <Textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => {
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        if (errors[`q_${q.id}`])
                          setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                      }}
                      placeholder="Your answer…"
                      className="min-h-[100px] bg-muted/30 border-border/80 text-sm resize-y"
                    />
                  )}

                  {q.type === "YES_NO" && (
                    <div className="flex items-center gap-3">
                      {["Yes", "No"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setAnswers((a) => ({ ...a, [q.id]: opt }))
                            if (errors[`q_${q.id}`])
                              setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                          }}
                          className={`h-9 px-5 rounded-lg border text-sm font-semibold transition-all ${
                            answers[q.id] === opt
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/60 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "SINGLE_CHOICE" && (
                    <div className="space-y-2">
                      {opts.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => {
                              setAnswers((a) => ({ ...a, [q.id]: opt }))
                              if (errors[`q_${q.id}`])
                                setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                            }}
                            className="size-4 rounded-full border border-border text-primary focus:ring-1 focus:ring-primary accent-primary"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2">
                      {opts.map((opt) => {
                        const selected = (answers[q.id] ?? "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                        const isSelected = selected.includes(opt)

                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              name={`q_${q.id}`}
                              value={opt}
                              checked={isSelected}
                              onChange={() => {
                                const next = isSelected
                                  ? selected.filter((s) => s !== opt)
                                  : [...selected, opt]
                                setAnswers((a) => ({ ...a, [q.id]: next.join(", ") }))
                                if (errors[`q_${q.id}`])
                                  setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                              }}
                              className="size-4 rounded border border-border text-primary focus:ring-1 focus:ring-primary accent-primary"
                            />
                            <span>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {q.type === "FILE" && (
                    <div className="space-y-2">
                      {answers[q.id] ? (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40 border-border/80 text-sm">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-semibold text-primary truncate max-w-[200px]">
                              {answers[q.id].split("/").pop()}
                            </span>
                            <span className="text-muted-foreground text-[10px]">Uploaded</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAnswers((a) => {
                              const copy = { ...a }
                              delete copy[q.id]
                              return copy
                            })}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              
                              const formData = new FormData()
                              formData.append("file", file)
                              
                              const toastId = toast.loading(`Uploading ${file.name}...`)
                              try {
                                const { uploadPublicFile } = await import("@/app/dashboard/careers/actions")
                                const res = await uploadPublicFile(formData)
                                setAnswers((a) => ({ ...a, [q.id]: res.url }))
                                if (errors[`q_${q.id}`]) {
                                  setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                                }
                                toast.success("File uploaded successfully", { id: toastId })
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Upload failed", { id: toastId })
                              }
                            }}
                            accept=".pdf,.doc,.docx"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="h-9 px-3 rounded-lg border border-dashed border-border/80 bg-muted/30 text-muted-foreground flex items-center justify-center text-xs font-medium hover:bg-muted/50 transition-colors">
                            Click to upload document (PDF, DOC, DOCX)
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <FieldError message={errors[`q_${q.id}`]} />
                </div>
              )
            })}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full h-11 text-sm font-semibold gap-2 shadow-sm"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="size-4" />
            Submit Application
          </>
        )}
      </Button>
    </div>
  )
}
