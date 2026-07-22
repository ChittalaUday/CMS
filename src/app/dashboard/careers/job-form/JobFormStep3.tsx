"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, ListChecks, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertCircle, Paperclip } from "lucide-react"
import { QuestionDraft, QuestionType, QUESTION_TYPE_LABELS } from "./types"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

interface JobFormStep3Props {
  questions: QuestionDraft[]
  setQuestions: React.Dispatch<React.SetStateAction<QuestionDraft[]>>
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  
  showResume: boolean
  setShowResume: (val: boolean) => void
  requireResume: boolean
  setRequireResume: (val: boolean) => void
  
  showCoverLetter: boolean
  setShowCoverLetter: (val: boolean) => void
  requireCoverLetter: boolean
  setRequireCoverLetter: (val: boolean) => void
  
  addQuestion: () => void
  removeQuestion: (id: string) => void
  moveQuestion: (id: string, dir: "up" | "down") => void
  updateQuestion: (id: string, patch: Partial<QuestionDraft>) => void
  addOption: (id: string) => void
  removeOption: (id: string, opt: string) => void
  moveOption: (id: string, optIdx: number, dir: -1 | 1) => void
}

export function JobFormStep3({
  questions,
  errors,
  setErrors,
  showResume,
  setShowResume,
  requireResume,
  setRequireResume,
  showCoverLetter,
  setShowCoverLetter,
  requireCoverLetter,
  setRequireCoverLetter,
  addQuestion,
  removeQuestion,
  moveQuestion,
  updateQuestion,
  addOption,
  removeOption,
  moveOption
}: JobFormStep3Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-3 border-b border-border/60">
        <h2 className="text-xl font-bold">Questionnaire</h2>
        <p className="text-sm text-muted-foreground">
          Configure default application fields and add custom screening questions.
        </p>
      </div>

      {/* Default Fields Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Default Fields</h3>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3.5">
          {/* Name */}
          <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold">Full Name</span>
              <p className="text-xs text-muted-foreground">Applicant&apos;s full name</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 opacity-60">
                <Switch checked={true} disabled={true} onCheckedChange={() => {}} />
                <span className="text-xs text-muted-foreground">Show</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <Switch checked={true} disabled={true} onCheckedChange={() => {}} />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold">Email</span>
              <p className="text-xs text-muted-foreground">Applicant&apos;s email address</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 opacity-60">
                <Switch checked={true} disabled={true} onCheckedChange={() => {}} />
                <span className="text-xs text-muted-foreground">Show</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <Switch checked={true} disabled={true} onCheckedChange={() => {}} />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold">Phone</span>
              <p className="text-xs text-muted-foreground">Applicant&apos;s phone number</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 opacity-60">
                <Switch checked={true} disabled={true} onCheckedChange={() => {}} />
                <span className="text-xs text-muted-foreground">Show</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <Switch checked={true} disabled={true} onCheckedChange={() => {}} />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
            </div>
          </div>

          {/* Resume / CV */}
          <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold">Resume / CV</span>
              <p className="text-xs text-muted-foreground">Applicant&apos;s resume document</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Switch checked={showResume} onCheckedChange={(v) => { setShowResume(v); if (!v) setRequireResume(false) }} />
                <span className="text-xs text-muted-foreground">Show</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={requireResume} disabled={!showResume} onCheckedChange={setRequireResume} />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold">Cover Letter</span>
              <p className="text-xs text-muted-foreground">Applicant&apos;s introductory cover letter</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Switch checked={showCoverLetter} onCheckedChange={(v) => { setShowCoverLetter(v); if (!v) setRequireCoverLetter(false) }} />
                <span className="text-xs text-muted-foreground">Show</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={requireCoverLetter} disabled={!showCoverLetter} onCheckedChange={setRequireCoverLetter} />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screening Questions Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Screening Questions</h3>

        {questions.length === 0 ? (
          <div className="min-h-40 rounded-xl border border-dashed border-border/80 bg-muted/10 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <ListChecks className="size-8 text-muted-foreground/40" />
            <div>
              <p className="font-semibold text-sm">No custom screening questions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applicants will only fill in the enabled default fields.
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mt-1" onClick={addQuestion}>
              <Plus className="size-3.5" /> Add Question
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
                        q.options.map((opt, optIdx) => (
                          <span key={opt} className="inline-flex items-center gap-0.5 text-xs bg-muted/60 border border-border/60 pl-1 pr-1.5 py-0.5 rounded-lg">
                            <div className="flex items-center">
                              <button type="button" onClick={() => moveOption(q.tempId, optIdx, -1)} disabled={optIdx === 0} className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 cursor-pointer p-0.5">
                                <ChevronLeft className="size-3" />
                              </button>
                              <button type="button" onClick={() => moveOption(q.tempId, optIdx, 1)} disabled={optIdx === q.options.length - 1} className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 cursor-pointer p-0.5">
                                <ChevronRight className="size-3" />
                              </button>
                            </div>
                            <span className="px-1">{opt}</span>
                            <div className="w-px h-3 bg-border/60 mx-0.5" />
                            <button type="button" onClick={() => removeOption(q.tempId, opt)}
                              className="text-muted-foreground/60 hover:text-destructive leading-none cursor-pointer p-0.5" aria-label={`Remove "${opt}"`}>
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
    </div>
  )
}
