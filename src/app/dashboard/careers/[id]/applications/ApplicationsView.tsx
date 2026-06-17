"use client"

import { useState, useTransition } from "react"
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
} from "lucide-react"
import { updateApplicationStatus } from "../../actions"

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
  createdAt: Date
  answers?: Answer[]
}

interface ApplicationsViewProps {
  applications: Application[]
  jobTitle: string
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

const NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  NEW: ["REVIEWING", "SHORTLISTED", "REJECTED"],
  REVIEWING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["HIRED", "REJECTED"],
  REJECTED: ["REVIEWING"],
  HIRED: [],
}

// Full pipeline order for the dropdown
const ALL_STATUSES: ApplicationStatus[] = [
  "NEW",
  "REVIEWING",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
]

export function ApplicationsView({ applications: initial, jobTitle }: ApplicationsViewProps) {
  const [applications, setApplications] = useState(initial)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL")
  const [selected, setSelected] = useState<Application | null>(null)
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filtered = applications.filter((a) => {
    const matchesSearch =
      !search ||
      a.applicantName.toLowerCase().includes(search.toLowerCase()) ||
      a.applicantEmail.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status counts for the pill filters
  const counts = applications.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

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

  function openDrawer(app: Application) {
    setSelected(app)
    setNotes(app.notes ?? "")
  }

  function saveNotes() {
    if (!selected) return
    handleUpdateStatus(selected.id, selected.status, notes)
  }

  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicants…"
              className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
            />
          </div>

          {/* Status pill filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", ...ALL_STATUSES] as const).map((s) => {
              const isActive = statusFilter === s
              const cfg = s !== "ALL" ? STATUS_CONFIG[s] : null
              const count = s === "ALL" ? applications.length : (counts[s] ?? 0)

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`h-7 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  {cfg && (
                    <span
                      className={`size-1.5 rounded-full ${isActive ? "bg-primary-foreground" : cfg.dotColor}`}
                    />
                  )}
                  {s === "ALL" ? "All" : cfg!.label}
                  <span className="opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
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
                      className="group hover:bg-muted/20 transition-colors duration-150"
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

                      {/* Contact */}
                      <td className="px-4 py-4 hidden md:table-cell">
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
                      <td className="px-3 sm:px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <div className="hidden sm:contents">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-muted"
                              title="View full application"
                              onClick={() => openDrawer(app)}
                            >
                              <Eye className="size-3.5 text-muted-foreground" />
                            </Button>
                          </div>

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
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {selected.applicantName}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs">
                    <Mail className="size-3" />
                    {selected.applicantEmail}
                  </span>
                  {selected.applicantPhone && (
                    <span className="flex items-center gap-1 text-xs">
                      <Phone className="size-3" />
                      {selected.applicantPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs">
                    <Calendar className="size-3" />
                    Applied{" "}
                    {new Date(selected.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Status + quick actions */}
                <div className="flex items-center gap-3 flex-wrap">
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
                    <SelectTrigger className="h-8 text-xs w-44 bg-muted/30 border-border/60">
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

                {/* Resume link */}
                {selected.resumeUrl && (
                  <a
                    href={selected.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/5 transition-colors w-fit"
                  >
                    <FileText className="size-3.5" />
                    View Resume
                    <ExternalLink className="size-3" />
                  </a>
                )}

                {/* Cover letter */}
                {selected.coverLetter && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cover Letter
                    </p>
                    <p className="text-sm text-foreground/80 whitespace-pre-line bg-muted/20 rounded-lg p-3 border border-border/40">
                      {selected.coverLetter}
                    </p>
                  </div>
                )}

                {/* Questionnaire answers */}
                {selected.answers && selected.answers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Questionnaire Answers
                    </p>
                    {selected.answers
                      .sort((a, b) => a.question.order - b.question.order)
                      .map((ans) => (
                        <div key={ans.id} className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            {ans.question.question}
                          </p>
                          <p className="text-sm text-foreground/80 bg-muted/20 rounded-lg px-3 py-2 border border-border/40">
                            {ans.answer || <span className="text-muted-foreground italic">No answer provided</span>}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                <Separator className="bg-border/40" />

                {/* Internal notes */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="size-3" />
                    Internal Notes
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes visible only to your team…"
                    className="min-h-[80px] bg-muted/30 border-border/80 text-sm resize-y"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={saveNotes}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                    Save Notes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
