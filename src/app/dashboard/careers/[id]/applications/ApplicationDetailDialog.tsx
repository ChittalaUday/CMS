"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
  Calendar,
  Sparkles,
  Briefcase,
  User,
  Loader2,
  FileText,
  CheckCircle2,
} from "lucide-react"

import { getAtsScore, getApplicationById } from "../../actions"

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false })

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  NEW: ["REVIEWING"],
  REVIEWING: ["NEW", "SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REVIEWING", "HIRED"],
  HIRED: ["SHORTLISTED"],
  REJECTED: ["REVIEWING"],
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; classes: string; dotColor: string }
> = {
  NEW: {
    label: "New",
    classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  REVIEWING: {
    label: "Reviewing",
    classes: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    dotColor: "bg-yellow-500",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dotColor: "bg-purple-500",
  },
  REJECTED: {
    label: "Rejected",
    classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dotColor: "bg-red-500",
  },
  HIRED: {
    label: "Hired",
    classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
}

interface Answer {
  id: string
  answer: string
  question: {
    id: string
    question: string
    type: string
    order: number
  }
}

interface Application {
  id: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string | null
  resumeUrl: string | null
  coverLetter: string | null
  status: ApplicationStatus
  notes: string | null
  atsScore: number | null
  atsConfidence: number | null
  atsJustification: string | null
  extractedSkills: string[]
  extractedExperience: number | null
  extractedLocation: string | null
  extractedEducation: string | null
  atsStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "IDLE"
  createdAt: Date
  answers?: Answer[]
}

interface JobPosting {
  id: string
  title: string
  department: string
  location: string
  description: string | null
  requirements: string | null
  keywords: string[]
}

interface ApplicationDetailDialogProps {
  application: Application | null
  isOpen: boolean
  onClose: () => void
  job: JobPosting
  onStatusChange: (id: string, status: ApplicationStatus, notes?: string) => Promise<void>
  onApplicationUpdate?: (app: Application) => void
}

export function ApplicationDetailDialog({
  application,
  isOpen,
  onClose,
  job,
  onStatusChange,
  onApplicationUpdate,
}: ApplicationDetailDialogProps) {
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [tempNotes, setTempNotes] = useState("")
  const [isPending, startTransition] = useTransition()

  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [atsConfidence, setAtsConfidence] = useState<number | null>(null)
  const [atsJustification, setAtsJustification] = useState<string | null>(null)
  const [isAtsLoading, setIsAtsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"ai" | "pdf">("ai")
  const [ollamaModels, setOllamaModels] = useState<{ name: string; model: string }[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const pollCancelledRef = useRef(false)

  useEffect(() => {
    if (application) {
      setAtsScore(application.atsScore)
      setAtsConfidence(application.atsConfidence)
      setAtsJustification(application.atsJustification)
      setIsAtsLoading(application.atsStatus === "PROCESSING")
    }
  }, [application])

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        const models = data.models || []
        setOllamaModels(models)
        if (models.length > 0) {
          setSelectedModel((prev) => prev || models[0].name)
        }
      })
      .catch(() => {})
  }, [])

  // Cancel any in-flight poll when the dialog closes
  useEffect(() => {
    if (!isOpen) {
      pollCancelledRef.current = true
    } else {
      pollCancelledRef.current = false
    }
  }, [isOpen])

  if (!application) return null

  async function handleRunAtsScorer() {
    if (!application) return
    setIsAtsLoading(true)
    setAtsScore(null)
    setAtsConfidence(null)
    setAtsJustification(null)
    pollCancelledRef.current = false

    try {
      await getAtsScore(application.id, selectedModel || undefined)
      toast.info("Analysis queued — processing in the background...")

      const poll = async () => {
        if (pollCancelledRef.current) return
        try {
          const app = await getApplicationById(application.id)
          if (pollCancelledRef.current || !app) return

          if (app.atsStatus === "COMPLETED") {
            setAtsScore(app.atsScore)
            setAtsConfidence(app.atsConfidence)
            setAtsJustification(app.atsJustification)
            setIsAtsLoading(false)
            toast.success("ATS analysis complete!")
            if (onApplicationUpdate) {
              onApplicationUpdate(app as unknown as Application)
            }
          } else if (app.atsStatus === "FAILED") {
            setIsAtsLoading(false)
            toast.error(app.atsJustification || "Analysis failed — please try again.")
          } else {
            setTimeout(poll, 2000)
          }
        } catch {
          if (!pollCancelledRef.current) {
            setIsAtsLoading(false)
            toast.error("Failed to fetch analysis result.")
          }
        }
      }

      setTimeout(poll, 2000)
    } catch (err: unknown) {
      setIsAtsLoading(false)
      toast.error((err as Error).message || "Failed to queue ATS analysis.")
    }
  }

  function handleSaveAtsToNotes() {
    if (!application || atsScore === null || !atsJustification) return
    const atsText = `[ATS AI Scorer Match: ${atsScore}%]\n${atsJustification}`
    const updatedNotes = application.notes ? `${application.notes}\n\n${atsText}` : atsText
    
    startTransition(async () => {
      await onStatusChange(application.id, application.status, updatedNotes)
    })
  }

  function handleSaveNotes() {
    if (!application) return
    startTransition(async () => {
      await onStatusChange(application.id, application.status, tempNotes)
      setIsNotesDialogOpen(false)
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-[96vw] w-[96vw] sm:max-w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-5 gap-4 overflow-hidden bg-background border border-border rounded-xl"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60 shrink-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {application.applicantName}
              </DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {application.applicantEmail}
                </span>
                {application.applicantPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3.5" />
                    {application.applicantPhone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Applied {new Date(application.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:ml-auto">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    STATUS_CONFIG[application.status].classes
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${STATUS_CONFIG[application.status].dotColor}`}
                  />
                  {STATUS_CONFIG[application.status].label}
                </span>

                {ALLOWED_TRANSITIONS[application.status].map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-2.5 gap-1.5 font-bold uppercase tracking-wider border-border/60 hover:bg-muted"
                      onClick={() => onStatusChange(application.id, s, application.notes ?? undefined)}
                    >
                      <span className={`size-1.5 rounded-full ${cfg.dotColor}`} />
                      {cfg.label}
                    </Button>
                  )
                })}
              </div>

              <Separator orientation="vertical" className="h-6 bg-border/60 hidden sm:block" />

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 shadow-sm bg-muted/40 border-border/60 hover:bg-muted"
                onClick={() => {
                  setTempNotes(application.notes ?? "")
                  setIsNotesDialogOpen(true)
                }}
              >
                <MessageSquare className="size-3.5 text-amber-500" />
                {application.notes ? "Edit Notes" : "Add Notes"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 overflow-hidden">
            {/* COLUMN 1: JOB DETAILS */}
            <div className="flex flex-col h-full overflow-hidden border border-border/60 rounded-xl bg-card/25 p-4 space-y-4">
              <div className="shrink-0 pb-2 border-b border-border/40">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" />
                  Job Posting Details
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
                <div>
                  <p className="font-bold text-sm text-foreground">{job.title}</p>
                  <p className="text-muted-foreground mt-0.5">{job.department} • {job.location}</p>
                </div>

                {job.description && (
                  <div className="space-y-1">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
                    <div
                      className="prose prose-sm dark:prose-invert text-foreground/80 max-w-none text-xs line-clamp-10"
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  </div>
                )}

                {job.requirements && (
                  <div className="space-y-1">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider">Requirements</p>
                    <div
                      className="prose prose-sm dark:prose-invert text-foreground/80 max-w-none text-xs"
                      dangerouslySetInnerHTML={{ __html: job.requirements }}
                    />
                  </div>
                )}

                {job.keywords && job.keywords.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider">Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.keywords.map((kw: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 font-normal rounded-md"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: RESPONSES + NOTES */}
            <div className="flex flex-col h-full overflow-hidden border border-border/60 rounded-xl bg-card/25 p-4 space-y-4">
              <div className="shrink-0 pb-2 border-b border-border/40">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Application Responses
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {application.coverLetter && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cover Letter
                    </p>
                    <p className="text-xs text-foreground/80 whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border/40">
                      {application.coverLetter}
                    </p>
                  </div>
                )}

                {application.answers && application.answers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-primary" />
                      Screening Questions
                    </p>
                    <div className="space-y-3">
                      {application.answers
                        .slice()
                        .sort((a, b) => a.question.order - b.question.order)
                        .map((ans) => (
                          <div
                            key={ans.id}
                            className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5"
                          >
                            <p className="text-[11px] font-semibold text-muted-foreground leading-snug">
                              {ans.question.question}
                            </p>
                            <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">
                              {ans.answer || <span className="italic text-muted-foreground">No answer provided</span>}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-amber-500" />
                      Internal Notes
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1 text-primary hover:bg-primary/5 font-bold uppercase tracking-wider"
                      onClick={() => {
                        setTempNotes(application.notes ?? "")
                        setIsNotesDialogOpen(true)
                      }}
                    >
                      {application.notes ? "Edit" : "Add"}
                    </Button>
                  </div>
                  {application.notes ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 whitespace-pre-line leading-relaxed">
                      {application.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-muted/10 rounded-lg p-3 border border-border/20 text-center">
                      No internal notes added yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 3: AI + DOCUMENT VIEWER */}
            <div className="flex flex-col h-full overflow-hidden border border-border/60 rounded-xl bg-card/25 p-4 space-y-4">
              <div className="shrink-0 pb-2 border-b border-border/40 flex items-center justify-between">
                <div className="flex bg-muted/65 p-1 rounded-lg border border-border/40">
                  <button
                    onClick={() => setActiveTab("ai")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === "ai"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="size-3.5" />
                    AI Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab("pdf")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === "pdf"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="size-3.5" />
                    Document Viewer
                  </button>
                </div>

                {activeTab === "pdf" && application.resumeUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-7 text-[10px] gap-1 px-2.5 font-bold uppercase tracking-wider border-border/60 shadow-sm"
                  >
                    <a
                      href={application.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in New Tab <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {activeTab === "ai" ? (
                  <div className="space-y-4">
                    <div className="space-y-3 bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="size-4 text-primary animate-pulse" />
                          ATS AI Scorer
                        </span>
                        {!isAtsLoading && atsScore === null && (
                          <Button
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2.5 font-bold uppercase tracking-wider shadow-sm"
                            onClick={handleRunAtsScorer}
                          >
                            Scan Application
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">Model:</span>
                        {ollamaModels.length > 0 ? (
                          <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="h-6 text-[10px] bg-background/60 border-border/60 flex-1 px-2">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {ollamaModels.map((m) => (
                                <SelectItem key={m.name} value={m.name} className="text-xs">
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic">Ollama offline — using default</span>
                        )}
                      </div>

                      {isAtsLoading && (
                        <div className="flex flex-col items-center justify-center py-4 gap-2 text-muted-foreground text-xs">
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span>Analyzing with <span className="font-semibold text-primary">{selectedModel || "AI model"}</span>...</span>
                        </div>
                      )}

                      {!isAtsLoading && atsScore !== null && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="relative size-12 shrink-0 flex items-center justify-center font-bold text-lg rounded-full bg-background border-2 border-primary/30">
                              <span className={atsScore >= 70 ? "text-emerald-500" : atsScore >= 40 ? "text-yellow-500" : "text-red-500"}>
                                {atsScore}%
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-foreground">Match Rating & Confidence</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                <span>{atsScore >= 70 ? "Strong Fit" : atsScore >= 40 ? "Potential Fit" : "Low Match"}</span>
                                {atsConfidence !== null && (
                                  <>
                                    <span>·</span>
                                    <span className="font-semibold text-primary">Confidence: {atsConfidence}%</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1 ml-auto border-border/60 shadow-sm"
                              onClick={handleSaveAtsToNotes}
                            >
                              Save to Notes
                            </Button>
                          </div>
                          {atsJustification && (
                            <p className="text-xs text-foreground/80 leading-relaxed bg-background/50 rounded-lg p-2.5 border border-border/20">
                              {atsJustification}
                            </p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[9px] w-full text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider"
                            onClick={handleRunAtsScorer}
                          >
                            Recalculate
                          </Button>
                        </div>
                      )}
                    </div>

                    {!isAtsLoading && (application.extractedSkills?.length > 0 || application.extractedExperience !== null || application.extractedLocation || application.extractedEducation) && (
                      <div className="space-y-3 bg-muted/40 rounded-xl p-4 border border-border/60">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="size-4 text-muted-foreground" />
                          Extracted Candidate Profile (AI)
                        </span>
                        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                          {application.extractedExperience !== null && (
                            <div>
                              <span className="text-muted-foreground block font-medium">Experience:</span>
                              <span className="font-semibold text-foreground">{application.extractedExperience} years</span>
                            </div>
                          )}
                          {application.extractedLocation && (
                            <div>
                              <span className="text-muted-foreground block font-medium">Location:</span>
                              <span className="font-semibold text-foreground">{application.extractedLocation}</span>
                            </div>
                          )}
                          {application.extractedEducation && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground block font-medium">Highest Education:</span>
                              <span className="font-semibold text-foreground">{application.extractedEducation}</span>
                            </div>
                          )}
                          {application.extractedSkills && application.extractedSkills.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground block font-medium mb-1">Detected Skills:</span>
                              <div className="flex flex-wrap gap-1">
                                {application.extractedSkills.map((s, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted/20 rounded-lg overflow-hidden relative border border-border/40 flex flex-col min-h-[400px]">
                    {application.resumeUrl ? (
                      <div className="w-full h-full flex flex-col">
                        <PdfViewer url={application.resumeUrl} useProxy={true} />
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                        <FileText className="size-8 opacity-40" />
                        <p className="text-xs font-semibold">No resume uploaded</p>
                        <p className="text-[11px] opacity-75">The candidate did not attach a resume file.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-md p-5 bg-background border border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              {application.notes ? "Edit Internal Notes" : "Add Internal Notes"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter internal candidate evaluation notes visible only to recruiters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <Textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Candidate background details, interview evaluation, feedback..."
              className="min-h-[120px] text-xs bg-muted/20 border-border/85 resize-y focus:ring-1 focus:ring-primary"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsNotesDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleSaveNotes}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
