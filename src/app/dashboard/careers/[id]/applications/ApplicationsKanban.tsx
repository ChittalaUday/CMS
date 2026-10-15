"use client"

import { useState, useMemo, useEffect } from "react"
import {
  DndContext,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragEndEvent,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { KanbanColumn } from "./KanbanColumn"
import { ApplicationDetailDialog } from "./ApplicationDetailDialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { updateApplicationStatus, getApplications } from "../../actions"

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"
const STATUSES: ApplicationStatus[] = ["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"]

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  NEW: ["REVIEWING"],
  REVIEWING: ["NEW", "SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REVIEWING", "HIRED"],
  HIRED: ["SHORTLISTED"],
  REJECTED: ["REVIEWING"],
}

// Prioritise column droppables over card sortables so drag-to-column always registers
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  const colHit = pointer.find(({ id }) => STATUSES.includes(id as ApplicationStatus))
  if (colHit) return [colHit]
  if (pointer.length > 0) return pointer
  return rectIntersection(args)
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; dotColor: string }
> = {
  NEW: { label: "New", dotColor: "bg-blue-500" },
  REVIEWING: { label: "Reviewing", dotColor: "bg-yellow-500" },
  SHORTLISTED: { label: "Shortlisted", dotColor: "bg-purple-500" },
  REJECTED: { label: "Rejected", dotColor: "bg-red-500" },
  HIRED: { label: "Hired", dotColor: "bg-emerald-500" },
}

const COLUMN_PAGE_SIZE = 5

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

interface ApplicationsKanbanProps {
  applications: Application[]
  job: JobPosting
  search?: string
  pagination?: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  statusCounts?: Record<string, number>
}

export function ApplicationsKanban({
  applications: initialApplications,
  job,
  search: propSearch,
  statusCounts,
}: ApplicationsKanbanProps) {
  const [localSearch, setLocalSearch] = useState("")
  const search = propSearch !== undefined ? propSearch : localSearch
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [mobileTab, setMobileTab] = useState<ApplicationStatus>("NEW")

  // Per-column page state
  const [columnPages, setColumnPages] = useState<Record<ApplicationStatus, number>>({
    NEW: 1,
    REVIEWING: 1,
    SHORTLISTED: 1,
    REJECTED: 1,
    HIRED: 1,
  })

  // Group initial applications by status
  const groupedInitial = useMemo(() => {
    const map: Record<ApplicationStatus, Application[]> = {
      NEW: [],
      REVIEWING: [],
      SHORTLISTED: [],
      REJECTED: [],
      HIRED: [],
    }
    for (const app of initialApplications) {
      if (map[app.status]) {
        map[app.status].push(app)
      }
    }
    return map
  }, [initialApplications])

  // Items per column
  const [columnItems, setColumnItems] = useState<Record<ApplicationStatus, Application[]>>(() => ({
    NEW: groupedInitial.NEW.slice(0, COLUMN_PAGE_SIZE),
    REVIEWING: groupedInitial.REVIEWING.slice(0, COLUMN_PAGE_SIZE),
    SHORTLISTED: groupedInitial.SHORTLISTED.slice(0, COLUMN_PAGE_SIZE),
    REJECTED: groupedInitial.REJECTED.slice(0, COLUMN_PAGE_SIZE),
    HIRED: groupedInitial.HIRED.slice(0, COLUMN_PAGE_SIZE),
  }))

  // Totals per column
  const [columnTotals, setColumnTotals] = useState<Record<ApplicationStatus, number>>(() => ({
    NEW: statusCounts?.NEW ?? groupedInitial.NEW.length,
    REVIEWING: statusCounts?.REVIEWING ?? groupedInitial.REVIEWING.length,
    SHORTLISTED: statusCounts?.SHORTLISTED ?? groupedInitial.SHORTLISTED.length,
    REJECTED: statusCounts?.REJECTED ?? groupedInitial.REJECTED.length,
    HIRED: statusCounts?.HIRED ?? groupedInitial.HIRED.length,
  }))

  // Loading state per column
  const [columnLoading, setColumnLoading] = useState<Record<ApplicationStatus, boolean>>({
    NEW: false,
    REVIEWING: false,
    SHORTLISTED: false,
    REJECTED: false,
    HIRED: false,
  })

  const [prevInitial, setPrevInitial] = useState(initialApplications)
  if (initialApplications !== prevInitial) {
    setPrevInitial(initialApplications)
    setColumnItems({
      NEW: groupedInitial.NEW.slice(0, COLUMN_PAGE_SIZE),
      REVIEWING: groupedInitial.REVIEWING.slice(0, COLUMN_PAGE_SIZE),
      SHORTLISTED: groupedInitial.SHORTLISTED.slice(0, COLUMN_PAGE_SIZE),
      REJECTED: groupedInitial.REJECTED.slice(0, COLUMN_PAGE_SIZE),
      HIRED: groupedInitial.HIRED.slice(0, COLUMN_PAGE_SIZE),
    })
    setColumnTotals({
      NEW: statusCounts?.NEW ?? groupedInitial.NEW.length,
      REVIEWING: statusCounts?.REVIEWING ?? groupedInitial.REVIEWING.length,
      SHORTLISTED: statusCounts?.SHORTLISTED ?? groupedInitial.SHORTLISTED.length,
      REJECTED: statusCounts?.REJECTED ?? groupedInitial.REJECTED.length,
      HIRED: statusCounts?.HIRED ?? groupedInitial.HIRED.length,
    })
  }

  // Fetch fresh data per column on mount if incomplete or when search changes
  useEffect(() => {
    let cancelled = false

    async function fetchColumns() {
      const needFetch =
        Boolean(search.trim()) ||
        STATUSES.some((st) => (statusCounts?.[st] ?? 0) > groupedInitial[st].length)

      if (!needFetch) return

      setColumnLoading({
        NEW: true,
        REVIEWING: true,
        SHORTLISTED: true,
        REJECTED: true,
        HIRED: true,
      })

      const results = await Promise.all(
        STATUSES.map((status) =>
          getApplications(job.id, {
            status,
            page: 1,
            pageSize: COLUMN_PAGE_SIZE,
            search: search.trim() || undefined,
          }).catch(() => null)
        )
      )

      if (cancelled) return

      const newItems: Partial<Record<ApplicationStatus, Application[]>> = {}
      const newTotals: Partial<Record<ApplicationStatus, number>> = {}

      STATUSES.forEach((status, idx) => {
        const res = results[idx]
        if (res) {
          newItems[status] = res.applications
          newTotals[status] = res.totalCount
        }
      })

      setColumnItems((prev) => ({ ...prev, ...newItems }))
      setColumnTotals((prev) => ({ ...prev, ...newTotals }))
      setColumnPages({
        NEW: 1,
        REVIEWING: 1,
        SHORTLISTED: 1,
        REJECTED: 1,
        HIRED: 1,
      })
      setColumnLoading({
        NEW: false,
        REVIEWING: false,
        SHORTLISTED: false,
        REJECTED: false,
        HIRED: false,
      })
    }

    fetchColumns()

    return () => {
      cancelled = true
    }
  }, [job.id, search, groupedInitial, statusCounts])

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require dragging 8px before activation to avoid misclicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press delay to avoid page scroll conflicts on touchscreens
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle column page change
  async function handleColumnPageChange(status: ApplicationStatus, newPage: number) {
    setColumnPages((prev) => ({ ...prev, [status]: newPage }))
    setColumnLoading((prev) => ({ ...prev, [status]: true }))
    try {
      const res = await getApplications(job.id, {
        status,
        page: newPage,
        pageSize: COLUMN_PAGE_SIZE,
        search: search.trim() || undefined,
      })
      setColumnItems((prev) => ({ ...prev, [status]: res.applications }))
      setColumnTotals((prev) => ({ ...prev, [status]: res.totalCount }))
    } catch (err: unknown) {
      toast.error((err as Error).message || `Failed to load page ${newPage} for ${STATUS_CONFIG[status].label}`)
    } finally {
      setColumnLoading((prev) => ({ ...prev, [status]: false }))
    }
  }

  // Handle manual status update via detail sheet or mobile dropdown
  async function handleStatusUpdate(id: string, newStatus: ApplicationStatus, notes?: string) {
    let original: Application | undefined
    let oldStatus: ApplicationStatus | null = null

    for (const status of STATUSES) {
      const found = columnItems[status]?.find((a) => a.id === id)
      if (found) {
        original = found
        oldStatus = status
        break
      }
    }

    if (!original || !oldStatus) {
      if (selectedApp?.id === id) {
        original = selectedApp
        oldStatus = selectedApp.status
      } else {
        return
      }
    }

    if (oldStatus === newStatus) {
      if (notes !== undefined) {
        setColumnItems((prev) => ({
          ...prev,
          [oldStatus!]: (prev[oldStatus!] || []).map((a) => (a.id === id ? { ...a, notes } : a)),
        }))
        if (selectedApp?.id === id) {
          setSelectedApp((prev) => (prev ? { ...prev, notes } : null))
        }
        await updateApplicationStatus(id, newStatus, notes)
      }
      return
    }

    const updatedApp: Application = {
      ...original,
      status: newStatus,
      notes: notes !== undefined ? notes : original.notes,
    }

    // Optimistic Update
    setColumnItems((prev) => ({
      ...prev,
      [oldStatus!]: (prev[oldStatus!] || []).filter((a) => a.id !== id),
      [newStatus]: [updatedApp, ...(prev[newStatus] || [])].slice(0, COLUMN_PAGE_SIZE),
    }))

    setColumnTotals((prev) => ({
      ...prev,
      [oldStatus!]: Math.max(0, (prev[oldStatus!] ?? 1) - 1),
      [newStatus]: (prev[newStatus] ?? 0) + 1,
    }))

    if (selectedApp?.id === id) {
      setSelectedApp(updatedApp)
    }

    try {
      await updateApplicationStatus(id, newStatus, notes)
      toast.success(`Application updated to ${STATUS_CONFIG[newStatus].label}.`)
    } catch (err: unknown) {
      // Revert
      setColumnItems((prev) => ({
        ...prev,
        [oldStatus!]: [original!, ...(prev[oldStatus!] || [])],
        [newStatus]: (prev[newStatus] || []).filter((a) => a.id !== id),
      }))
      setColumnTotals((prev) => ({
        ...prev,
        [oldStatus!]: (prev[oldStatus!] ?? 0) + 1,
        [newStatus]: Math.max(0, (prev[newStatus] ?? 1) - 1),
      }))
      if (selectedApp?.id === id) {
        setSelectedApp(original)
      }
      toast.error((err as Error).message || "Failed to update candidate status.")
    }
  }

  // Handle drag and drop action
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const applicationId = active.id as string
    const target = over.id as string

    // Find active application
    let app: Application | undefined
    let sourceStatus: ApplicationStatus | null = null

    for (const status of STATUSES) {
      const found = columnItems[status]?.find((a) => a.id === applicationId)
      if (found) {
        app = found
        sourceStatus = status
        break
      }
    }
    if (!app || !sourceStatus) return

    // Determine target status
    let targetStatus: ApplicationStatus | null = null

    if (STATUSES.includes(target as ApplicationStatus)) {
      // Dropped directly on column droppable zone
      targetStatus = target as ApplicationStatus
    } else {
      // Dropped over another card, find that card's status
      for (const status of STATUSES) {
        const found = columnItems[status]?.find((a) => a.id === target)
        if (found) {
          targetStatus = status
          break
        }
      }
    }

    if (!targetStatus || targetStatus === sourceStatus) return

    const allowed = ALLOWED_TRANSITIONS[sourceStatus]
    if (!allowed.includes(targetStatus)) {
      toast.error(`Cannot move ${STATUS_CONFIG[sourceStatus].label} → ${STATUS_CONFIG[targetStatus].label}.`)
      return
    }

    const originalApp = app
    const updatedApp: Application = { ...app, status: targetStatus }

    // Optimistic update
    setColumnItems((prev) => ({
      ...prev,
      [sourceStatus]: (prev[sourceStatus] || []).filter((a) => a.id !== applicationId),
      [targetStatus]: [updatedApp, ...(prev[targetStatus] || [])].slice(0, COLUMN_PAGE_SIZE),
    }))

    setColumnTotals((prev) => ({
      ...prev,
      [sourceStatus]: Math.max(0, (prev[sourceStatus] ?? 1) - 1),
      [targetStatus]: (prev[targetStatus] ?? 0) + 1,
    }))

    try {
      await updateApplicationStatus(applicationId, targetStatus, app.notes ?? undefined)
      toast.success(`Candidate moved to ${STATUS_CONFIG[targetStatus].label}.`)
    } catch (err: unknown) {
      // Revert optimistic update
      setColumnItems((prev) => ({
        ...prev,
        [sourceStatus]: [originalApp, ...(prev[sourceStatus] || [])],
        [targetStatus]: (prev[targetStatus] || []).filter((a) => a.id !== applicationId),
      }))
      setColumnTotals((prev) => ({
        ...prev,
        [sourceStatus]: (prev[sourceStatus] ?? 0) + 1,
        [targetStatus]: Math.max(0, (prev[targetStatus] ?? 1) - 1),
      }))
      toast.error((err as Error).message || "Failed to move candidate status.")
    }
  }

  // Flatten currently visible applications across columns for detail dialog navigation
  const allVisibleApps = useMemo(() => {
    return STATUSES.flatMap((status) => columnItems[status] || [])
  }, [columnItems])

  return (
    <>
      {/* Search Bar (standalone mode only) */}
      {propSearch === undefined && (
        <div className="flex items-center gap-3 justify-between pb-3 border-b border-border/40">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search applicants by name, skills..."
              className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
            />
          </div>
        </div>
      )}

      {/* Mobile Tab Selector (shown below md breakpoint) */}
      <div className="flex md:hidden overflow-x-auto gap-1 p-1 bg-muted/35 rounded-xl border border-border/40 shrink-0">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setMobileTab(status)}
            className={`flex-1 min-w-17.5 py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center transition-all ${
              mobileTab === status
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_CONFIG[status].label} ({columnTotals[status] ?? 0})
          </button>
        ))}
      </div>

      {/* Kanban Board Container */}
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        {/* Desktop Layout: side-by-side scrollable columns */}
        <div className="hidden md:flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-137.5 w-full">
          {STATUSES.map((status) => {
            const totalCount = columnTotals[status] ?? 0
            const totalPages = Math.max(1, Math.ceil(totalCount / COLUMN_PAGE_SIZE))
            return (
              <KanbanColumn
                key={status}
                status={status}
                label={STATUS_CONFIG[status].label}
                dotColor={STATUS_CONFIG[status].dotColor}
                applications={columnItems[status] || []}
                totalCount={totalCount}
                page={columnPages[status] ?? 1}
                pageSize={COLUMN_PAGE_SIZE}
                totalPages={totalPages}
                isLoading={columnLoading[status]}
                onPageChange={(newPage) => handleColumnPageChange(status, newPage)}
                onViewDetails={setSelectedApp}
                onStatusChange={handleStatusUpdate}
              />
            )
          })}
        </div>

        {/* Mobile Layout: show only the selected tab's column */}
        <div className="md:hidden pt-2">
          <KanbanColumn
            status={mobileTab}
            label={STATUS_CONFIG[mobileTab].label}
            dotColor={STATUS_CONFIG[mobileTab].dotColor}
            applications={columnItems[mobileTab] || []}
            totalCount={columnTotals[mobileTab] ?? 0}
            page={columnPages[mobileTab] ?? 1}
            pageSize={COLUMN_PAGE_SIZE}
            totalPages={Math.max(1, Math.ceil((columnTotals[mobileTab] ?? 0) / COLUMN_PAGE_SIZE))}
            isLoading={columnLoading[mobileTab]}
            onPageChange={(newPage) => handleColumnPageChange(mobileTab, newPage)}
            onViewDetails={setSelectedApp}
            onStatusChange={handleStatusUpdate}
          />
        </div>
      </DndContext>

      {/* Application Details Dialog */}
      <ApplicationDetailDialog
        application={selectedApp}
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        job={job}
        onStatusChange={handleStatusUpdate}
        onApplicationUpdate={(updated) => {
          setColumnItems((prev) => ({
            ...prev,
            [updated.status]: (prev[updated.status] || []).map((a) => (a.id === updated.id ? updated : a)),
          }))
          if (selectedApp?.id === updated.id) {
            setSelectedApp(updated)
          }
        }}
        onNavigatePrev={() => {
          const idx = selectedApp ? allVisibleApps.findIndex((a) => a.id === selectedApp.id) : -1
          if (idx > 0) setSelectedApp(allVisibleApps[idx - 1])
        }}
        onNavigateNext={() => {
          const idx = selectedApp ? allVisibleApps.findIndex((a) => a.id === selectedApp.id) : -1
          if (idx >= 0 && idx < allVisibleApps.length - 1) setSelectedApp(allVisibleApps[idx + 1])
        }}
        hasPrev={selectedApp ? allVisibleApps.findIndex((a) => a.id === selectedApp.id) > 0 : false}
        hasNext={selectedApp ? allVisibleApps.findIndex((a) => a.id === selectedApp.id) < allVisibleApps.length - 1 : false}
        currentIndex={selectedApp ? allVisibleApps.findIndex((a) => a.id === selectedApp.id) : 0}
        totalInList={allVisibleApps.length}
      />
    </>
  )
}

