"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  const [resumeUrl, setResumeUrl] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Your name is required."
    if (!email.trim()) errs.email = "Your email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address."
    }
    questions.forEach((q) => {
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
        await submitApplication({
          jobId,
          applicantName: name.trim(),
          applicantEmail: email.trim(),
          applicantPhone: phone.trim() || undefined,
          resumeUrl: resumeUrl.trim() || undefined,
          coverLetter: coverLetter.trim() || undefined,
          answers: Object.entries(answers)
            .filter(([, v]) => v.trim())
            .map(([questionId, answer]) => ({ questionId, answer: answer.trim() })),
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
            <span className="font-semibold text-foreground">{jobTitle}</span>. We'll review
            your application and get back to you if there's a match.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Phone{" "}
              <span className="text-muted-foreground/60 font-normal normal-case">
                (optional)
              </span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="resume"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Resume / Portfolio URL{" "}
              <span className="text-muted-foreground/60 font-normal normal-case">
                (optional)
              </span>
            </Label>
            <Input
              id="resume"
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="cover"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Cover Letter{" "}
            <span className="text-muted-foreground/60 font-normal normal-case">
              (optional)
            </span>
          </Label>
          <Textarea
            id="cover"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Tell us why you're a great fit for this role…"
            className="min-h-[120px] bg-muted/30 border-border/80 text-sm resize-y"
          />
        </div>
      </div>

      {/* Custom questions */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold border-b border-border/60 pb-2">
            Screening Questions
          </h3>

          {questions
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
                    <div className="flex flex-wrap gap-2">
                      {opts.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setAnswers((a) => ({ ...a, [q.id]: opt }))
                            if (errors[`q_${q.id}`])
                              setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                          }}
                          className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-all ${
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

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="flex flex-wrap gap-2">
                      {opts.map((opt) => {
                        const selected = (answers[q.id] ?? "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                        const isSelected = selected.includes(opt)

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? selected.filter((s) => s !== opt)
                                : [...selected, opt]
                              setAnswers((a) => ({ ...a, [q.id]: next.join(", ") }))
                              if (errors[`q_${q.id}`])
                                setErrors((e) => ({ ...e, [`q_${q.id}`]: "" }))
                            }}
                            className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border/60 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {isSelected && <span className="mr-1 text-[10px]">✓</span>}
                            {opt}
                          </button>
                        )
                      })}
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
