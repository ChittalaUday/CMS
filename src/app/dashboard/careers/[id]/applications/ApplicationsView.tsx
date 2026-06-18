"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import dynamic from "next/dynamic"

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false })
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Mail,
  Phone,
  ExternalLink,
  MoreHorizontal,
  Eye,
  User,
  Calendar,
  CheckCircle2,
  Search,
  Loader2,
  MessageSquare,
  FileText,
  ChevronDown,
  Briefcase,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import { updateApplicationStatus, getAtsScore, getApplicationById } from "../../actions"
import { evaluateSearchQuery } from "@/lib/ats/search-parser"

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"

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

interface ApplicationsViewProps {
  applications: Application[]
  job: any
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


// Full pipeline order for the dropdown
const ALL_STATUSES: ApplicationStatus[] = [
  "NEW",
  "REVIEWING",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
]

export function ApplicationsView({ applications: initial, job }: ApplicationsViewProps) {
  const [applications, setApplications] = useState(initial)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL")
  const [selected, setSelected] = useState<Application | null>(null)
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [tempNotes, setTempNotes] = useState("")

  const filtered = applications.filter((a) => {
    const matchesSearch =
      !search ||
      evaluateSearchQuery(search, {
        applicantName: a.applicantName,
        applicantEmail: a.applicantEmail,
        coverLetter: a.coverLetter,
        extractedSkills: a.extractedSkills || [],
        extractedExperience: a.extractedExperience || 0,
        extractedLocation: a.extractedLocation || null,
        extractedEducation: a.extractedEducation || null,
      })
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status counts for the stat cards
  const counts = applications.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const statCards = [
    { key: "ALL" as const,         label: "Total",      count: applications.length,      dotColor: "bg-foreground",    cardColor: statusFilter === "ALL" ? "border-primary bg-primary/5" : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-primary/5" },
    { key: "NEW" as const,         label: "New",        count: counts["NEW"] ?? 0,        dotColor: "bg-blue-500",      cardColor: statusFilter === "NEW" ? "border-blue-500 bg-blue-500/5" : "border-border/60 bg-card/40 hover:border-blue-500/40 hover:bg-blue-500/5" },
    { key: "REVIEWING" as const,   label: "Reviewing",  count: counts["REVIEWING"] ?? 0,  dotColor: "bg-yellow-500",    cardColor: statusFilter === "REVIEWING" ? "border-yellow-500 bg-yellow-500/5" : "border-border/60 bg-card/40 hover:border-yellow-500/40 hover:bg-yellow-500/5" },
    { key: "SHORTLISTED" as const, label: "Shortlisted",count: counts["SHORTLISTED"] ?? 0,dotColor: "bg-purple-500",    cardColor: statusFilter === "SHORTLISTED" ? "border-purple-500 bg-purple-500/5" : "border-border/60 bg-card/40 hover:border-purple-500/40 hover:bg-purple-500/5" },
    { key: "REJECTED" as const,    label: "Rejected",   count: counts["REJECTED"] ?? 0,   dotColor: "bg-red-500",       cardColor: statusFilter === "REJECTED" ? "border-red-500 bg-red-500/5" : "border-border/60 bg-card/40 hover:border-red-500/40 hover:bg-red-500/5" },
    { key: "HIRED" as const,       label: "Hired",      count: counts["HIRED"] ?? 0,      dotColor: "bg-emerald-500",   cardColor: statusFilter === "HIRED" ? "border-emerald-500 bg-emerald-500/5" : "border-border/60 bg-card/40 hover:border-emerald-500/40 hover:bg-emerald-500/5" },
  ]

  function handleUpdateStatus(id: string, status: ApplicationStatus, internalNotes?: string) {
    setUpdatingId(id)
    startTransition(async () => {
      try {
        await updateApplicationStatus(id, status, internalNotes)
        setApplications((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status, notes: internalNotes !== undefined ? internalNotes : a.notes }
              : a
          )
        )
        // Update selected drawer if open
        if (selected?.id === id) {
          setSelected((s) =>
            s
              ? { ...s, status, notes: internalNotes !== undefined ? internalNotes : s.notes }
              : null
          )
        }
        toast.success(`Application moved to ${STATUS_CONFIG[status].label}.`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status.")
      } finally {
        setUpdatingId(null)
      }
    })
  }

  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [atsConfidence, setAtsConfidence] = useState<number | null>(null)
  const [atsJustification, setAtsJustification] = useState<string | null>(null)
  const [isAtsLoading, setIsAtsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"ai" | "pdf">("ai")
  const [ollamaModels, setOllamaModels] = useState<{ name: string; model: string }[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")

  // Fetch available Ollama models once on mount
  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        const models: { name: string; model: string }[] = data.models || []
        setOllamaModels(models)
        // Default to the first available model if none selected
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].name)
        }
      })
      .catch(() => {
        // Ollama offline — no models to show
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openDrawer(app: Application) {
    setSelected(app)
    setNotes(app.notes ?? "")
    setAtsScore(app.atsScore)
    setAtsConfidence(app.atsConfidence)
    setAtsJustification(app.atsJustification)
    setIsAtsLoading(app.atsStatus === "PROCESSING")
    setActiveTab("ai")
  }

  async function handleRunAtsScorer() {
    if (!selected) return
    setIsAtsLoading(true)
    setAtsScore(null)
    setAtsConfidence(null)
    setAtsJustification(null)

    try {
      // Fire-and-forget: enqueues the job and returns immediately (won't be cancelled on browser disconnect)
      await getAtsScore(selected.id, selectedModel || undefined)
      toast.info("Analysis queued — processing in the background...")

      // Poll until the queue worker marks it COMPLETED or FAILED
      const poll = async () => {
        try {
          const app = await getApplicationById(selected.id)
          if (!app) return

          if (app.atsStatus === "COMPLETED") {
            setAtsScore(app.atsScore)
            setAtsConfidence(app.atsConfidence)
            setAtsJustification(app.atsJustification)
            setApplications((prev) =>
              prev.map((a) =>
                a.id === selected.id
                  ? {
                      ...a,
                      atsStatus: "COMPLETED",
                      atsScore: app.atsScore,
                      atsConfidence: app.atsConfidence,
                      atsJustification: app.atsJustification,
                      extractedSkills: app.extractedSkills || [],
                      extractedExperience: app.extractedExperience ?? null,
                      extractedLocation: app.extractedLocation ?? null,
                      extractedEducation: app.extractedEducation ?? null,
                    }
                  : a
              )
            )
            setIsAtsLoading(false)
            toast.success("ATS analysis complete!")
          } else if (app.atsStatus === "FAILED") {
            setIsAtsLoading(false)
            toast.error(app.atsJustification || "Analysis failed — please try again.")
          } else {
            // Still PENDING or PROCESSING — keep polling
            setTimeout(poll, 2000)
          }
        } catch {
          setIsAtsLoading(false)
          toast.error("Failed to fetch analysis result.")
        }
      }

      setTimeout(poll, 2000)
    } catch (err: any) {
      setIsAtsLoading(false)
      toast.error(err.message || "Failed to queue ATS analysis.")
    }
  }

  function handleSaveAtsToNotes() {
    if (!selected || atsScore === null || !atsJustification) return
    const atsText = `[ATS AI Scorer Match: ${atsScore}%]\n${atsJustification}`
    const updatedNotes = selected.notes ? `${selected.notes}\n\n${atsText}` : atsText
    handleUpdateStatus(selected.id, selected.status, updatedNotes)
    setNotes(updatedNotes)
  }

  function saveNotes() {
    if (!selected) return
    handleUpdateStatus(selected.id, selected.status, notes)
  }

  function handleSaveNotes() {
    if (!selected) return
    handleUpdateStatus(selected.id, selected.status, tempNotes)
    setIsNotesDialogOpen(false)
  }


  return (
    <>
      {/* Clickable stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statCards.map((card) => (
          <button
            key={card.key}
            onClick={() => setStatusFilter(card.key)}
            className={`group rounded-xl border p-3 flex flex-col items-start gap-1 text-left transition-all duration-150 cursor-pointer relative overflow-hidden ${card.cardColor}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full shrink-0 ${card.dotColor}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</span>
              </div>
              <span className="text-[9px] font-semibold text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-150 uppercase tracking-wider">
                {statusFilter === card.key ? "Active" : "Filter"}
              </span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-foreground leading-none">{card.count}</span>
          </button>
        ))}
      </div>

      {/* Search + count row */}
      <div className="flex items-center gap-3 justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicants…"
            className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
          />
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          {filtered.length} of {applications.length} shown
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="min-h-[200px] rounded-xl border border-dashed border-border/80 bg-muted/10 flex flex-col items-center justify-center gap-2 p-8 text-center">
          <User className="size-7 text-muted-foreground/40" />
          <p className="font-semibold text-sm">No applications match your filter</p>
          <p className="text-xs text-muted-foreground">Try changing the status filter or search term.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
          <div className="bg-card/40 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ATS Match
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Applied
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((app) => {
                  const cfg = STATUS_CONFIG[app.status]
                  const isUpdating = updatingId === app.id

                  return (
                    <tr
                      key={app.id}
                      onClick={() => openDrawer(app)}
                      className="group hover:bg-muted/20 cursor-pointer transition-colors duration-150"
                    >
                      {/* Applicant */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-xs text-muted-foreground">
                            {app.applicantName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground leading-snug">
                              {app.applicantName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {app.applicantEmail}
                            </p>
                            {app.notes && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <MessageSquare className="size-3 shrink-0" />
                                <span className="truncate max-w-[160px]" title={app.notes}>
                                  {app.notes}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.classes}`}
                        >
                          <span className={`size-1.5 rounded-full ${cfg.dotColor}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* ATS Match */}
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        {app.atsStatus === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/40">
                            Pending
                          </span>
                        )}
                        {app.atsStatus === "PROCESSING" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 animate-pulse">
                            <Loader2 className="size-2.5 animate-spin" />
                            Analyzing...
                          </span>
                        )}
                        {app.atsStatus === "COMPLETED" && app.atsScore !== null && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              app.atsScore >= 70
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : app.atsScore >= 40
                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            }`}
                            title={app.atsJustification || ""}
                          >
                            {app.atsScore}% Match
                          </span>
                        )}
                        {app.atsStatus === "FAILED" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title={app.atsJustification || ""}>
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <a
                            href={`mailto:${app.applicantEmail}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Mail className="size-3 shrink-0" />
                            {app.applicantEmail}
                          </a>
                          {app.applicantPhone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="size-3 shrink-0" />
                              {app.applicantPhone}
                            </span>
                          )}
                          {app.resumeUrl && (
                            <a
                              href={app.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileText className="size-3 shrink-0" />
                              Resume
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Applied date */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(app.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 sm:px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <div className="hidden sm:contents">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg hover:bg-muted"
                                    onClick={() => openDrawer(app)}
                                  >
                                    <Eye className="size-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">View full application</TooltipContent>
                              </Tooltip>
                            </div>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 rounded-lg hover:bg-muted"
                                      disabled={isUpdating}
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                      ) : (
                                        <MoreHorizontal className="size-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 text-sm">
                                    <DropdownMenuItem onClick={() => openDrawer(app)}>
                                      <Eye className="size-3.5 text-muted-foreground mr-2" />
                                      View Application
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {ALL_STATUSES.filter((s) => s !== app.status).map((s) => {
                                      const c = STATUS_CONFIG[s]
                                      return (
                                        <DropdownMenuItem
                                          key={s}
                                          onClick={() => handleUpdateStatus(app.id, s)}
                                        >
                                          <span className={`size-2 rounded-full ${c.dotColor} mr-2`} />
                                          Move to {c.label}
                                        </DropdownMenuItem>
                                      )
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TooltipTrigger>
                              <TooltipContent side="top">Move / more actions</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent 
          aria-describedby={undefined}
          className="max-w-[96vw] w-[96vw] sm:max-w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-5 gap-4 overflow-hidden bg-background"
        >
          {selected && (
            <>
              {/* TOP TOOLBAR: Move action to top */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60 shrink-0">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {selected.applicantName}
                  </DialogTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {selected.applicantEmail}
                    </span>
                    {selected.applicantPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3.5" />
                        {selected.applicantPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      Applied {new Date(selected.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:ml-auto">
                  {/* Status update control */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        STATUS_CONFIG[selected.status].classes
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${STATUS_CONFIG[selected.status].dotColor}`}
                      />
                      {STATUS_CONFIG[selected.status].label}
                    </span>

                    <Select
                      value={selected.status}
                      onValueChange={(v) =>
                        handleUpdateStatus(selected.id, v as ApplicationStatus, notes)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs w-36 bg-muted/30 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {STATUS_CONFIG[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator orientation="vertical" className="h-6 bg-border/60 hidden sm:block" />

                  {/* Notes quick save button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 shadow-sm bg-muted/40 border-border/60 hover:bg-muted"
                    onClick={() => {
                      setTempNotes(selected.notes ?? "")
                      setIsNotesDialogOpen(true)
                    }}
                  >
                    <MessageSquare className="size-3.5 text-amber-500" />
                    {selected.notes ? "Edit Notes" : "Add Notes"}
                  </Button>
                </div>
              </div>

              {/* THREE COLUMN GRID: left (job), middle (answers + notes), right (document viewer) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 overflow-hidden">
                {/* COLUMN 1: JOB POSTING DETAILS */}
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

                    {job.responsibilities && (
                      <div className="space-y-1">
                        <p className="font-semibold text-muted-foreground uppercase tracking-wider">Responsibilities</p>
                        <div 
                          className="prose prose-sm dark:prose-invert text-foreground/80 max-w-none text-xs"
                          dangerouslySetInnerHTML={{ __html: job.responsibilities }} 
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

                {/* COLUMN 2: APPLICANT ANSWERS + COVER LETTER + NOTES */}
                <div className="flex flex-col h-full overflow-hidden border border-border/60 rounded-xl bg-card/25 p-4 space-y-4">
                  <div className="shrink-0 pb-2 border-b border-border/40">
                    <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                      <User className="size-4 text-primary" />
                      Application Responses
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    {/* Cover Letter */}
                    {selected.coverLetter && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Cover Letter
                        </p>
                        <p className="text-xs text-foreground/80 whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border/40">
                          {selected.coverLetter}
                        </p>
                      </div>
                    )}

                    {/* Question Answers */}
                    {selected.answers && selected.answers.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 text-primary" />
                          Screening Questions
                        </p>
                        <div className="space-y-3">
                          {selected.answers
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

                    {/* Internal Notes Display */}
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
                            setTempNotes(selected.notes ?? "")
                            setIsNotesDialogOpen(true)
                          }}
                        >
                          {selected.notes ? "Edit" : "Add"}
                        </Button>
                      </div>
                      {selected.notes ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 whitespace-pre-line leading-relaxed">
                          {selected.notes}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic bg-muted/10 rounded-lg p-3 border border-border/20 text-center">
                          No internal notes added yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                { }
                <div className="flex flex-col h-full overflow-hidden border border-border/60 rounded-xl bg-card/25 p-4 space-y-4">
                  {/* Tabs header */}
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

                    {activeTab === "pdf" && selected.resumeUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 text-[10px] gap-1 px-2.5 font-bold uppercase tracking-wider border-border/60 shadow-sm"
                      >
                        <a
                          href={selected.resumeUrl}
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
                        {/* ATS AI Match Scorer */}
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

                          {/* Model selector */}
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

                        {/* Extracted Profile Metadata */}
                        {!isAtsLoading && selected && (selected.extractedSkills?.length > 0 || selected.extractedExperience !== null || selected.extractedLocation || selected.extractedEducation) && (
                          <div className="space-y-3 bg-muted/40 rounded-xl p-4 border border-border/60">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Briefcase className="size-4 text-muted-foreground" />
                              Extracted Candidate Profile (AI)
                            </span>
                            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                              {selected.extractedExperience !== null && (
                                <div>
                                  <span className="text-muted-foreground block font-medium">Experience:</span>
                                  <span className="font-semibold text-foreground">{selected.extractedExperience} years</span>
                                </div>
                              )}
                              {selected.extractedLocation && (
                                <div>
                                  <span className="text-muted-foreground block font-medium">Location:</span>
                                  <span className="font-semibold text-foreground">{selected.extractedLocation}</span>
                                </div>
                              )}
                              {selected.extractedEducation && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground block font-medium">Highest Education:</span>
                                  <span className="font-semibold text-foreground">{selected.extractedEducation}</span>
                                </div>
                              )}
                              {selected.extractedSkills && selected.extractedSkills.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground block font-medium mb-1">Detected Skills:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {selected.extractedSkills.map((s, idx) => (
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
                        {selected.resumeUrl ? (
                          <div className="w-full h-full flex flex-col">
                            <PdfViewer url={selected.resumeUrl} useProxy={true} />
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Internal Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-md p-5 bg-background border border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              {selected?.notes ? "Edit Internal Notes" : "Add Internal Notes"}
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
