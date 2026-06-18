"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import { ExportDialog } from "./ExportDialog"

export function ExportButton({ jobId, className = "h-10" }: { jobId?: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={`gap-2 border-border/80 hover:bg-muted font-semibold shadow-sm shrink-0 ${className}`}
      >
        <FileSpreadsheet className="size-4 text-emerald-500" />
        Export Applicants
      </Button>
      <ExportDialog isOpen={isOpen} onClose={() => setIsOpen(false)} jobId={jobId} />
    </>
  )
}
