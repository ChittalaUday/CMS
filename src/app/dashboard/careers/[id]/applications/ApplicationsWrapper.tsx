"use client"

import { useState, useEffect } from "react"
import { LayoutGrid, Table2, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApplicationsView } from "./ApplicationsView"
import { ApplicationsKanban } from "./ApplicationsKanban"

type ViewMode = "board" | "table"

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
  status: "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"
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
  responsibilities: string | null
  keywords: string[]
}

interface ApplicationsWrapperProps {
  applications: Application[]
  job: JobPosting
}

export function ApplicationsWrapper({
  applications,
  job,
}: ApplicationsWrapperProps) {
  const [view, setView] = useState<ViewMode>("board")
  const [search, setSearch] = useState("")
  const [mounted, setMounted] = useState(false)

  // Retrieve view mode preference from localStorage on client-side mount
  useEffect(() => {
    const savedView = localStorage.getItem("applications_view_mode") as ViewMode
    if (savedView && (savedView === "board" || savedView === "table")) {
      setView(savedView)
    }
    setMounted(true)
  }, [])

  function handleViewChange(mode: ViewMode) {
    setView(mode)
    localStorage.setItem("applications_view_mode", mode)
  }

  // To prevent hydration flickering mismatch, we show a loading skeletons structure on SSR
  if (!mounted) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground/60 gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Loading applications...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page Layout View Toggle Header bar (with search in same line) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        {/* Search Bar */}
        <div className="relative max-w-xs flex-1 w-full sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicants by name, skills..."
            className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-muted/65 p-1 rounded-xl border border-border/40 shrink-0 self-end sm:self-auto">
          <Button
            size="sm"
            variant="ghost"
            className={`h-7 px-3.5 text-xs font-semibold gap-1.5 rounded-lg transition-all ${
              view === "board"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleViewChange("board")}
          >
            <LayoutGrid className="size-3.5" />
            Board View
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className={`h-7 px-3.5 text-xs font-semibold gap-1.5 rounded-lg transition-all ${
              view === "table"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleViewChange("table")}
          >
            <Table2 className="size-3.5" />
            Table View
          </Button>
        </div>
      </div>

      {/* Renders the selected layout mode */}
      {view === "board" ? (
        <ApplicationsKanban applications={applications} job={job} search={search} />
      ) : (
        <ApplicationsView applications={applications} job={job} search={search} />
      )}
    </div>
  )
}
