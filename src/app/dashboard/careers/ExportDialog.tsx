"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Download,
  Search,
  Calendar,
  X,
  Briefcase,
  Building2,
  MapPin,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Settings2,
} from "lucide-react"
import { getExportData } from "./actions"
import { toast } from "sonner"

type ExportJob = Awaited<ReturnType<typeof getExportData>>[number]
type ExportApplication = ExportJob["applications"][number]

interface ExportColumn {
  id: string
  label: string
  isQuestion?: boolean
}

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  jobId?: string
}

export function ExportDialog({ isOpen, onClose, jobId }: ExportDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [jobsData, setJobsData] = useState<ExportJob[]>([])
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // Filters state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [appStatus, setAppStatus] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Column Selection state
  const [selectedColIds, setSelectedColIds] = useState<string[]>([])

  const fetchExportData = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getExportData({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: appStatus === "ALL" ? undefined : appStatus,
          search: searchQuery || undefined,
        })
        setJobsData(data)

        // Automatically set active job ID
        if (data.length > 0) {
          if (jobId) {
            const found = data.find((j) => j.id === jobId)
            setActiveJobId(found ? found.id : data[0].id)
          } else {
            setActiveJobId((current) =>
              data.some((j) => j.id === current) ? current : data[0].id
            )
          }
        } else {
          setActiveJobId(null)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : ""
        toast.error(message || "Failed to load export data.")
      }
    })
  }, [startDate, endDate, appStatus, searchQuery, jobId])

  // Refetch when filters change or dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchExportData()
    }
  }, [isOpen, fetchExportData])

  // Get active job object
  const activeJob = jobsData.find((j) => j.id === activeJobId)

  // Column definitions for active job
  const getAvailableColumns = (job: ExportJob | undefined): ExportColumn[] => {
    if (!job) return []
    const base: ExportColumn[] = [
      { id: "name", label: "Applicant Name" },
      { id: "email", label: "Applicant Email" },
      { id: "phone", label: "Applicant Phone" },
      { id: "status", label: "Status" },
      { id: "date", label: "Applied Date" },
      { id: "ats", label: "ATS Score" },
      { id: "resume", label: "Resume URL" },
      { id: "cover", label: "Cover Letter" },
      { id: "notes", label: "Notes" },
    ]
    const questions: ExportColumn[] = (job.questions || []).map((q) => ({
      id: q.id,
      label: q.question,
      isQuestion: true,
    }))
    return [...base, ...questions]
  }

  const availableColumns = getAvailableColumns(activeJob)

  // Initialize/reset columns to select all whenever the active job's data changes.
  // Computed during render (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-based-on-a-prop-change
  const [colsResetFor, setColsResetFor] = useState<{ activeJobId: string | null; jobsData: ExportJob[] }>({
    activeJobId,
    jobsData,
  })
  if (colsResetFor.activeJobId !== activeJobId || colsResetFor.jobsData !== jobsData) {
    setColsResetFor({ activeJobId, jobsData })
    if (activeJob) {
      setSelectedColIds(getAvailableColumns(activeJob).map((col) => col.id))
    }
  }

  // Toggle single column selection
  const handleToggleCol = (colId: string) => {
    setSelectedColIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    )
  }

  // CSV Generation & Download Helper
  const handleDownloadCsv = () => {
    if (!activeJob) {
      toast.warning("No job selected for export.")
      return
    }
    const applications = activeJob.applications || []
    if (applications.length === 0) {
      toast.warning("No applications to export for this job.")
      return
    }

    const columnsToExport = availableColumns.filter((col) => selectedColIds.includes(col.id))
    if (columnsToExport.length === 0) {
      toast.warning("Please select at least one column to export.")
      return
    }

    const headers = columnsToExport.map((col) => col.label)

    const escapeCsvValue = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return ""
      let str = String(val)
      str = str.replace(/"/g, '""')
      if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
        return `"${str}"`
      }
      return str
    }

    const rows = applications.map((app: ExportApplication) => {
      const answersMap = new Map<string, string>(
        app.answers.map((ans) => [ans.questionId, String(ans.answer || "")])
      )
      
      const rowData: string[] = []

      columnsToExport.forEach((col) => {
        if (col.isQuestion) {
          rowData.push((answersMap.get(col.id) as string) || "")
        } else {
          switch (col.id) {
            case "name":
              rowData.push(app.applicantName)
              break
            case "email":
              rowData.push(app.applicantEmail)
              break
            case "phone":
              rowData.push(app.applicantPhone || "")
              break
            case "status":
              rowData.push(app.status)
              break
            case "date":
              rowData.push(
                new Date(app.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              )
              break
            case "ats":
              rowData.push(app.atsScore !== null ? String(app.atsScore) : "N/A")
              break
            case "resume":
              rowData.push(app.resumeUrl || "")
              break
            case "cover":
              rowData.push(app.coverLetter || "")
              break
            case "notes":
              rowData.push(app.notes || "")
              break
            default:
              rowData.push("")
          }
        }
      })

      return rowData.map(escapeCsvValue).join(",")
    })

    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `applications_${activeJob.slug || activeJob.id}_export.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${applications.length} applications for ${activeJob.title}`)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
    setAppStatus("ALL")
    setSearchQuery("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-background border border-border rounded-xl">
        
        {/* Dialog Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-500" />
              Export Job Applications
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Apply filters, choose export columns, and download full applicant spreadsheets.
            </DialogDescription>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-muted/10 border-b border-border grid grid-cols-1 md:grid-cols-5 gap-3 shrink-0">
          
          {/* Applicant Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicant name/email..."
              className="pl-8 text-xs h-9 bg-background border-border/80"
            />
          </div>

          {/* Application Status */}
          <Select value={appStatus} onValueChange={setAppStatus}>
            <SelectTrigger className="text-xs h-9 bg-background border-border/80">
              <SelectValue placeholder="Application Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Application Statuses</SelectItem>
              <SelectItem value="NEW" className="text-xs">New</SelectItem>
              <SelectItem value="REVIEWING" className="text-xs">Reviewing</SelectItem>
              <SelectItem value="SHORTLISTED" className="text-xs">Shortlisted</SelectItem>
              <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
              <SelectItem value="HIRED" className="text-xs">Hired</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-8 text-xs h-9 bg-background border-border/80"
              placeholder="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-8 text-xs h-9 bg-background border-border/80"
              placeholder="End Date"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {(startDate || endDate || appStatus !== "ALL" || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs px-3 border-border/60 hover:bg-muted"
              >
                <X className="size-3.5 mr-1" /> Clear
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchExportData}
              disabled={isPending}
              className="h-9 text-xs flex-1 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Selected Job Header / Dropdown Select */}
        <div className="px-6 py-3 border-b border-border bg-muted/5 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Job:</span>
            {jobId ? (
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Briefcase className="size-4 text-primary" />
                {activeJob?.title || "Loading..."}
              </h2>
            ) : (
              <Select value={activeJobId || ""} onValueChange={setActiveJobId}>
                <SelectTrigger className="h-8 text-xs bg-background border-border/80 min-w-60">
                  <SelectValue placeholder="Select a job posting" />
                </SelectTrigger>
                <SelectContent>
                  {jobsData.map((j) => (
                    <SelectItem key={j.id} value={j.id} className="text-xs">
                      {j.title} ({j.status.toLowerCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {activeJob && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="size-3" /> {activeJob.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {activeJob.location}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-primary font-semibold">
                {activeJob.applications?.length || 0} applicants
              </span>
            </div>
          )}
        </div>

        {/* Main Content Area: Scrollable applicant grid containing the entire filtered table */}
        <div className="flex-1 overflow-hidden p-6 bg-muted/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              Full CSV Sheet Preview
            </h4>
            {activeJob && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/60">
                    <Settings2 className="size-3.5" />
                    Select Columns ({selectedColIds.length} / {availableColumns.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 max-h-72 overflow-y-auto p-2 bg-popover border border-border animate-in fade-in-0 duration-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-1.5 px-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Toggle Columns</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedColIds(availableColumns.map((c) => c.id))}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSelectedColIds([])}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                        >
                          None
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 pt-1">
                      {availableColumns.map((col) => {
                        const checked = selectedColIds.includes(col.id)
                        return (
                          <div
                            key={col.id}
                            onClick={() => handleToggleCol(col.id)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs select-none"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => handleToggleCol(col.id)}
                              className="size-3.5"
                            />
                            <span className="truncate flex-1">{col.label}</span>
                            {col.isQuestion && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/5 text-primary">
                                Q
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex-1 border border-border/60 rounded-xl overflow-hidden bg-card flex flex-col">
            {isPending && jobsData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="size-8 animate-spin mb-3 text-primary" />
                <p className="text-sm">Loading applications data...</p>
              </div>
            ) : !activeJob || !activeJob.applications || activeJob.applications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="size-10 text-muted-foreground/60 mb-3" />
                <h3 className="text-sm font-bold text-foreground">No Applicants Match</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust your search or filter values to view matching applicant columns.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto max-h-[calc(90vh-320px)]">
                <table className="w-full text-left border-collapse text-[11px] font-mono relative">
                  <thead className="sticky top-0 z-10 bg-muted border-b border-border">
                    <tr>
                      {availableColumns
                        .filter((col) => selectedColIds.includes(col.id))
                        .map((col) => (
                          <th
                            key={col.id}
                            className="px-4 py-3 border-r border-border/40 font-bold whitespace-nowrap text-muted-foreground uppercase tracking-wider bg-muted"
                          >
                            {col.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card">
                    {activeJob.applications.map((app: ExportApplication) => {
                      const answersMap = new Map<string, string>(
                        app.answers.map((ans) => [ans.questionId, String(ans.answer || "")])
                      )
                      return (
                        <tr key={app.id} className="hover:bg-muted/10">
                          {availableColumns
                            .filter((col) => selectedColIds.includes(col.id))
                            .map((col) => {
                              let cellValue = ""
                              if (col.isQuestion) {
                                cellValue = (answersMap.get(col.id) as string) || "-"
                              } else {
                                switch (col.id) {
                                  case "name":
                                    cellValue = app.applicantName
                                    break
                                  case "email":
                                    cellValue = app.applicantEmail
                                    break
                                  case "phone":
                                    cellValue = app.applicantPhone || "-"
                                    break
                                  case "status":
                                    cellValue = app.status
                                    break
                                  case "date":
                                    cellValue = new Date(app.createdAt).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                    break
                                  case "ats":
                                    cellValue = app.atsScore !== null ? String(app.atsScore) : "N/A"
                                    break
                                  case "resume":
                                    cellValue = app.resumeUrl || "-"
                                    break
                                  case "cover":
                                    cellValue = app.coverLetter || "-"
                                    break
                                  case "notes":
                                    cellValue = app.notes || "-"
                                    break
                                }
                              }
                              return (
                                <td
                                  key={col.id}
                                  className="px-4 py-2.5 border-r border-border/40 text-foreground whitespace-nowrap truncate max-w-xs"
                                  title={cellValue}
                                >
                                  {cellValue}
                                </td>
                              )
                            })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Dialog Footer containing export action */}
        <div className="px-6 py-4 border-t border-border flex justify-end items-center gap-3 bg-muted/10 shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-9 px-4 flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadCsv}
              disabled={!activeJob || !activeJob.applications || activeJob.applications.length === 0 || selectedColIds.length === 0}
              className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-initial"
            >
              <Download className="size-3.5" />
              Download CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
