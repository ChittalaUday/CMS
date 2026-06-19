"use client"

import { useState } from "react"
import { GitMerge } from "lucide-react"
import { RevisionCompareDialog } from "./RevisionCompareDialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PublishRevisionButtonProps {
  draftId: string
  parentTitle: string
  scheduledAt?: Date | string | null
}

export function PublishRevisionButton({ draftId, parentTitle, scheduledAt }: PublishRevisionButtonProps) {
  return (
    <TooltipProvider>
      <RevisionCompareDialog
        draftId={draftId}
        scheduledAt={scheduledAt}
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                aria-label={`Review and publish revision of "${parentTitle}"`}
              >
                <GitMerge className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Review &amp; publish revision</TooltipContent>
          </Tooltip>
        }
      />
    </TooltipProvider>
  )
}
