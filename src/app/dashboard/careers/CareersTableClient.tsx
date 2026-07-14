"use client"

import { JobStatus } from "@/constants/careers"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Briefcase,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  IndianRupee,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { updateJobKeywords } from "./actions"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Job {
  id: string
  title: string
  slug: string
  department: string
  location: string
  jobType: string
  status: JobStatus
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  createdAt: Date | string
  closingDate: Date | string | null
  keywords: string[]
  requiredExperience: string | null
  createdBy: { id: string }
  _count: {
    applications: number
  }
}

interface CareersTableClientProps {
  jobs: Job[]
  canDelete: boolean
  currentUserId: string
  isAdmin: boolean
  handleUpdateStatus: (formData: FormData) => Promise<void>
  handleDelete: (formData: FormData) => Promise<void>
}

const STATUS_CONFIG: Record<JobStatus, { label: string; classes: string; icon: typeof AlertTriangle }> = {
  [JobStatus.DRAFT]: {
    label: "Draft",
    classes: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    icon: AlertTriangle,
  },
  [JobStatus.PUBLISHED]: {
    label: "Published",
    classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  [JobStatus.CLOSED]: {
    label: "Closed",
    classes: "bg-muted/60 text-muted-foreground border-border/60",
    icon: XCircle,
  },
}

const JOB_TYPE_SHORT: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
}

export function CareersTableClient({
  jobs,
  canDelete,
  currentUserId,
  isAdmin,
  handleUpdateStatus,
  handleDelete,
}: CareersTableClientProps) {
  const router = useRouter()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [dialogKeywords, setDialogKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [isPending, startTransition] = useTransition()
  const [deleteKwConfirmOpen, setDeleteKwConfirmOpen] = useState(false)
  const [kwToDelete, setKwToDelete] = useState<string | null>(null)

  const handleKeywordDeleteClick = (kw: string) => {
    setKwToDelete(kw)
    setDeleteKwConfirmOpen(true)
  }

  const handleKeywordDeleteConfirm = () => {
    if (kwToDelete) {
      setDialogKeywords(prev => prev.filter(k => k !== kwToDelete))
      setKwToDelete(null)
    }
  }

  const handleRowClick = (jobId: string, status: JobStatus, canManage: boolean) => {
    if (status === JobStatus.DRAFT) {
      if (canManage) router.push(`/dashboard/careers/${jobId}/edit`)
    } else {
      router.push(`/dashboard/careers/${jobId}/applications`)
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleKeywordsClick = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation()
    setSelectedJob(job)
    setDialogKeywords(job.keywords || [])
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
      <div className="bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[35%]">
                Job
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Details
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Keywords
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                Applications
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                Posted
              </th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status]
              const StatusIcon = cfg.icon
              const canManage = isAdmin || job.createdBy.id === currentUserId

              return (
                <tr
                  key={job.id}
                  onClick={() => handleRowClick(job.id, job.status, canManage)}
                  className="group hover:bg-muted/20 cursor-pointer transition-colors duration-150"
                >
                  {/* Title */}
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                        <Briefcase className="size-4 text-primary/60" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3 shrink-0" />
                            {job.department}
                          </span>
                          {job.closingDate && (() => {
                            const closingDate = new Date(job.closingDate)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            closingDate.setHours(0, 0, 0, 0)
                            const daysDiff = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
                            if (daysDiff >= 0 && daysDiff <= 5) {
                              return (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20 animate-pulse font-bold">
                                  Closes in {daysDiff}d
                                </Badge>
                              )
                            }
                            if (daysDiff < 0) {
                              return (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20 font-bold">
                                  Closed
                                </Badge>
                              )
                            }
                            return (
                              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
                                <span className="text-muted-foreground/30">•</span>
                                <Calendar className="size-2.5" />
                                Closes {closingDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.classes}`}
                    >
                      <StatusIcon className="size-3" />
                      {cfg.label}
                    </span>
                  </td>

                  {/* Details */}
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="space-y-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {job.location}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>{JOB_TYPE_SHORT[job.jobType] ?? job.jobType}</span>
                        {job.requiredExperience && (
                          <>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{job.requiredExperience}{job.requiredExperience.toLowerCase().includes("year") || job.requiredExperience.toLowerCase().includes("yr") ? "" : " years"} exp</span>
                          </>
                        )}
                      </div>
                      {(job.salaryMin || job.salaryMax) && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IndianRupee className="size-3 shrink-0" />
                          {job.currency}{" "}
                          {job.salaryMin?.toLocaleString("en-IN")}
                          {job.salaryMax ? ` – ${job.salaryMax.toLocaleString("en-IN")}` : "+"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Keywords (First 3 + remaining) */}
                  <td className="px-4 py-4 hidden md:table-cell" onClick={(e) => handleKeywordsClick(e, job)}>
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {job.keywords && job.keywords.length > 0 ? (
                        <>
                          {job.keywords.slice(0, 3).map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-px">
                              {kw}
                            </Badge>
                          ))}
                          {job.keywords.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-px bg-primary/5 border-primary/20 text-primary">
                              +{job.keywords.length - 3}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic opacity-60">None</span>
                      )}
                    </div>
                  </td>

                  {/* Application count */}
                  <td className="px-4 py-4 hidden lg:table-cell" onClick={handleActionClick}>
                    <Link
                      href={`/dashboard/careers/${job.id}/applications`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Users className="size-3.5" />
                      {job._count.applications} applicant
                      {job._count.applications !== 1 ? "s" : ""}
                    </Link>
                  </td>

                  {/* Posted date */}
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(job.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 sm:px-4 py-4" onClick={handleActionClick}>
                    <TooltipProvider>
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit + primary status action — sm+ */}
                        <div className="hidden sm:contents">
                          {canManage && (
                          <>
                          {/* Edit */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg hover:bg-muted"
                                asChild
                              >
                                <Link href={`/dashboard/careers/${job.id}/edit`}>
                                  <Edit className="size-3.5 text-muted-foreground" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Edit posting</TooltipContent>
                          </Tooltip>

                          {/* Publish (DRAFT) */}
                          {job.status === JobStatus.DRAFT && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id" value={job.id} />
                              <input type="hidden" name="newStatus" value={JobStatus.PUBLISHED} />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="submit"
                                    className="size-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Publish</TooltipContent>
                              </Tooltip>
                            </form>
                          )}

                          {/* Close (PUBLISHED) */}
                          {job.status === JobStatus.PUBLISHED && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id" value={job.id} />
                              <input type="hidden" name="newStatus" value={JobStatus.CLOSED} />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="submit"
                                    className="size-8 rounded-lg hover:bg-muted"
                                  >
                                    <XCircle className="size-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Close posting</TooltipContent>
                              </Tooltip>
                            </form>
                          )}

                          {/* Revert to Draft (CLOSED) */}
                          {job.status === JobStatus.CLOSED && (
                            <form action={handleUpdateStatus}>
                              <input type="hidden" name="id" value={job.id} />
                              <input type="hidden" name="newStatus" value={JobStatus.DRAFT} />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="submit"
                                    className="size-8 rounded-lg hover:bg-yellow-500/10 hover:text-yellow-500"
                                  >
                                    <AlertTriangle className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Revert to draft</TooltipContent>
                              </Tooltip>
                            </form>
                          )}
                          </>
                          )}
                        </div>

                        {/* ⋯ dropdown — secondary actions */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg hover:bg-muted data-[state=open]:opacity-100"
                                >
                                  <MoreHorizontal className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-sm">
                                {/* Edit — mobile only (sm+ sees the icon button) */}
                                {canManage && (
                                  <DropdownMenuItem asChild className="sm:hidden">
                                    <Link
                                      href={`/dashboard/careers/${job.id}/edit`}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <Edit className="size-3.5 text-muted-foreground" />
                                      Edit Posting
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/careers/${job.id}/applications`}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Users className="size-3.5 text-muted-foreground" />
                                    View Applications
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/careers/${job.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="size-3.5 text-muted-foreground" />
                                    Preview Public Page
                                  </a>
                                </DropdownMenuItem>
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <form action={handleDelete} className="w-full">
                                        <input type="hidden" name="id" value={job.id} />
                                        <button
                                          type="submit"
                                          className="w-full flex items-center gap-2 text-destructive cursor-pointer"
                                        >
                                          <Trash2 className="size-3.5" />
                                          Delete
                                        </button>
                                      </form>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TooltipTrigger>
                          <TooltipContent side="top">More actions</TooltipContent>
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

      {/* Keywords Management Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => { if (!open) setSelectedJob(null) }}>
        <DialogContent className="max-w-md p-5 bg-background border border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Manage Job Keywords
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add or remove search keywords and required skills for <strong className="text-foreground">{selectedJob?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="flex flex-wrap gap-1.5 min-h-7 max-h-48 overflow-y-auto pr-1">
              {dialogKeywords.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">No keywords configured yet.</span>
              ) : (
                dialogKeywords.map((kw) => (
                  <span key={kw} className="inline-flex items-center gap-1 text-xs bg-muted/65 border border-border/50 px-2 py-0.5 rounded-lg text-foreground">
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleKeywordDeleteClick(kw)}
                      className="text-muted-foreground/60 hover:text-destructive ml-0.5 leading-none font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const val = newKeyword.trim()
                    if (val && !dialogKeywords.includes(val)) {
                      setDialogKeywords(prev => [...prev, val])
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
                  if (val && !dialogKeywords.includes(val)) {
                    setDialogKeywords(prev => [...prev, val])
                    setNewKeyword("")
                  }
                }}
                disabled={!newKeyword.trim()}
              >
                Add
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedJob(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  if (!selectedJob) return
                  startTransition(async () => {
                    try {
                      await updateJobKeywords(selectedJob.id, dialogKeywords)
                      toast.success("Keywords updated successfully!")
                      router.refresh()
                      setSelectedJob(null)
                    } catch (err: any) {
                      toast.error(err.message || "Failed to update keywords")
                    }
                  })
                }}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        isOpen={deleteKwConfirmOpen}
        onClose={() => setDeleteKwConfirmOpen(false)}
        onConfirm={handleKeywordDeleteConfirm}
        title="Delete Keyword"
        description={`Are you sure you want to delete the keyword "${kwToDelete || ""}"?`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}
