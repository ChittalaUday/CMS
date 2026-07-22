"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Building2, MapPin, Briefcase, Clock, IndianRupeeIcon, Calendar, Paperclip, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { BasicDetails, DescriptionDetails, QuestionDraft, JOB_TYPE_LABELS, QUESTION_TYPE_LABELS } from "./types"
import { extractKeywordsFromText } from "../actions"

interface JobFormStep4Props {
  basic: BasicDetails
  desc: DescriptionDetails
  questions: QuestionDraft[]
  keywords: string[]
  setKeywords: React.Dispatch<React.SetStateAction<string[]>>
  
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setStep: (step: 1 | 2 | 3 | 4) => void
  handleKeywordDeleteClick: (kw: string) => void
  
  isRegeneratingKeywords: boolean
  setIsRegeneratingKeywords: (val: boolean) => void
}

export function JobFormStep4({
  basic,
  desc,
  questions,
  keywords,
  setKeywords,
  setErrors,
  setStep,
  handleKeywordDeleteClick,
  isRegeneratingKeywords,
  setIsRegeneratingKeywords
}: JobFormStep4Props) {
  const [newKeyword, setNewKeyword] = React.useState("")

  return (
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
            {basic.requiredExperience && (
              <span className="flex items-center gap-1">
                <Clock className="size-3 shrink-0" />
                {basic.requiredExperience}{basic.requiredExperience.toLowerCase().includes("year") || basic.requiredExperience.toLowerCase().includes("yr") ? "" : " years"} Experience
              </span>
            )}
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

        {/* Keywords editor */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Keywords ({keywords.length})
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1 px-2.5 font-bold uppercase tracking-wider border-border/60 shadow-sm"
              onClick={async () => {
                setIsRegeneratingKeywords(true)
                try {
                  const extracted = await extractKeywordsFromText({
                    title: basic.title,
                    department: basic.department,
                    description: desc.description,
                    requirements: desc.requirements || undefined,
                    responsibilities: desc.responsibilities || undefined,
                    questions: questions.map(q => q.question)
                  })
                  setKeywords(extracted)
                  toast.success("Keywords regenerated successfully!")
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to regenerate keywords")
                } finally {
                  setIsRegeneratingKeywords(false)
                }
              }}
              disabled={isRegeneratingKeywords}
            >
              {isRegeneratingKeywords ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="size-3 mr-1 text-primary" />
              )}
              Regenerate
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1.5 min-h-7">
            {keywords.filter(k => k !== "__exclude-global-template__").length === 0 ? (
              <span className="text-xs text-muted-foreground/60 italic">No keywords extracted yet — add below or click Regenerate</span>
            ) : (
              keywords.filter(k => k !== "__exclude-global-template__").map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 text-xs bg-muted/60 border border-border/60 px-2 py-0.5 rounded-lg text-foreground">
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleKeywordDeleteClick(kw)}
                    className="text-muted-foreground/60 hover:text-destructive ml-0.5 leading-none font-bold"
                    aria-label={`Remove keyword "${kw}"`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const val = newKeyword.trim()
                  if (val && !keywords.includes(val)) {
                    setKeywords(prev => [...prev, val])
                    setNewKeyword("")
                  }
                }
              }}
              placeholder="Type custom keyword and press Enter"
              className="h-8 bg-muted/30 border-border/80 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0 border-border/60"
              onClick={() => {
                const val = newKeyword.trim()
                if (val && !keywords.includes(val)) {
                  setKeywords(prev => [...prev, val])
                  setNewKeyword("")
                }
              }}
              disabled={!newKeyword.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
