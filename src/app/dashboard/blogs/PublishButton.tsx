"use client"

import { useState } from "react"
import { Globe, Upload, Loader2, CalendarClock } from "lucide-react"
import { useTransition } from "react"
import { togglePublished } from "./actions"
import { PublishSheet } from "./PublishSheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"

interface PublishButtonProps {
  postId: string
  postTitle: string
  isPublished: boolean
  scheduledAt?: Date | string | null
}

export function PublishButton({ postId, postTitle, isPublished, scheduledAt }: PublishButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleUnpublish = () => {
    startTransition(async () => {
      try {
        await togglePublished(postId)
        toast.success(`"${postTitle}" moved back to Draft`)
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to unpublish")
      }
    })
  }

  const isScheduled = !!scheduledAt && !isPublished

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={isPending}
            onClick={() => {
              if (isPublished) {
                handleUnpublish()
              } else {
                setSheetOpen(true)
              }
            }}
            className={`size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-50 ${
              isPublished
                ? "text-emerald-500 hover:text-emerald-600"
                : isScheduled
                ? "text-sky-400 hover:text-sky-500"
                : "text-muted-foreground/50 hover:text-emerald-500"
            }`}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isPublished ? (
              <Globe className="size-3.5" />
            ) : isScheduled ? (
              <CalendarClock className="size-3.5" />
            ) : (
              <Upload className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isPublished ? "Unpublish" : isScheduled ? "Edit schedule" : "Publish"}
        </TooltipContent>
      </Tooltip>

      {!isPublished && (
        <PublishSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          postId={postId}
          postTitle={postTitle}
          isPublished={isPublished}
          scheduledAt={scheduledAt}
        />
      )}
    </TooltipProvider>
  )
}
