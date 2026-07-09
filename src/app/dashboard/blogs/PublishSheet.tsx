"use client"

import { useState, useTransition } from "react"
import {
  Clock,
  Globe,
  Loader2,
  CalendarClock,
  CalendarCheck,
  X,
  GitMerge,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  togglePublished,
  schedulePost,
  unschedulePost,
  publishPostDraftRevision,
  schedulePostDraftRevision,
  unschedulePostDraftRevision,
} from "./actions"

interface PublishSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  postTitle: string
  isPublished: boolean
  scheduledAt?: Date | string | null
  /** When true, postId is the draft revision ID — publishing applies it to the parent post. */
  isRevision?: boolean
  onPublished?: () => void
}

function formatScheduled(dt: Date | string) {
  const d = new Date(dt)
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function PublishSheet({
  open,
  onOpenChange,
  postId,
  postTitle,
  isPublished,
  scheduledAt,
  isRevision = false,
  onPublished,
}: PublishSheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [isPendingNow, startNow] = useTransition()
  const [isPendingSchedule, startSchedule] = useTransition()
  const [isPendingUnschedule, startUnschedule] = useTransition()

  const isScheduled = !!scheduledAt && !isPublished
  const isPending = isPendingNow || isPendingSchedule || isPendingUnschedule

  const handlePublishNow = () => {
    startNow(async () => {
      try {
        if (isRevision) {
          await publishPostDraftRevision(postId)
          toast.success("Revision applied — live post updated.")
        } else {
          await togglePublished(postId)
          toast.success(`"${postTitle}" is now live.`)
        }
        onOpenChange(false)
        onPublished?.()
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to publish.")
      }
    })
  }

  const handleSchedule = () => {
    if (!selectedDate) {
      toast.error("Please select a date.")
      return
    }
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const dt = new Date(selectedDate)
    dt.setHours(hours, minutes, 0, 0)

    if (dt <= new Date()) {
      toast.error("Scheduled time must be in the future.")
      return
    }

    startSchedule(async () => {
      try {
        if (isRevision) {
          await schedulePostDraftRevision(postId, dt)
        } else {
          await schedulePost(postId, dt)
        }
        toast.success(`Scheduled for ${formatScheduled(dt)}.`)
        onOpenChange(false)
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to schedule.")
      }
    })
  }

  const handleUnschedule = () => {
    startUnschedule(async () => {
      try {
        if (isRevision) {
          await unschedulePostDraftRevision(postId)
        } else {
          await unschedulePost(postId)
        }
        toast.success("Schedule cancelled — post returned to draft.")
        onOpenChange(false)
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to unschedule.")
      }
    })
  }

  // Disable past dates in the calendar
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHeader className="px-6 py-5 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            {isRevision ? (
              <GitMerge className="size-4 text-primary" />
            ) : (
              <Globe className="size-4 text-primary" />
            )}
            <SheetTitle className="text-base font-semibold">
              {isRevision ? "Publish Revision" : "Publish Settings"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">
            {isRevision
              ? `Apply the pending revision to the live post "${postTitle}"`
              : `"${postTitle}"`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Currently scheduled banner */}
          {isScheduled && scheduledAt && (
            <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/8 px-4 py-3">
              <CalendarCheck className="size-4 text-sky-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Scheduled to publish</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {formatScheduled(scheduledAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={handleUnschedule}
                disabled={isPending}
                title="Cancel schedule"
              >
                {isPendingUnschedule ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </Button>
            </div>
          )}

          {/* Publish Now section */}
          <div className="px-6 pt-6 pb-5 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="size-3.5 text-emerald-500" />
                Publish Now
              </p>
              <p className="text-xs text-muted-foreground">
                {isRevision
                  ? "Apply the draft revision to the live post immediately."
                  : "Make this article publicly visible right away."}
              </p>
            </div>
            <Button
              className="h-9 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              onClick={handlePublishNow}
              disabled={isPending}
            >
              {isPendingNow ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isRevision ? (
                <GitMerge className="size-3.5" />
              ) : (
                <Globe className="size-3.5" />
              )}
              {isRevision ? "Apply Revision Now" : "Publish Now"}
            </Button>
          </div>

          <Separator className="mx-6 w-auto" />

          {/* Schedule section */}
          <div className="px-6 pt-5 pb-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarClock className="size-3.5 text-sky-400" />
                Schedule for Later
              </p>
              <p className="text-xs text-muted-foreground">
                {isRevision
                  ? "The revision will be applied automatically at the chosen time."
                  : "The article will go live automatically at the chosen date and time."}
              </p>
            </div>

            {/* Calendar */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/50 p-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < today}
                className="mx-auto"
              />
            </div>

            {/* Time picker */}
            <div className="space-y-1.5">
              <label
                htmlFor="schedule-time"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
                <input
                  id="schedule-time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="h-9 w-full pl-9 pr-3 rounded-md border border-border/60 bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </div>
            </div>

            {selectedDate && (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 font-mono">
                Will publish: {formatScheduled(
                  (() => {
                    const [h, m] = selectedTime.split(":").map(Number)
                    const d = new Date(selectedDate)
                    d.setHours(h, m, 0, 0)
                    return d
                  })()
                )}
              </p>
            )}

            <Button
              variant="outline"
              className="h-9 gap-1.5 font-semibold w-full sm:w-auto border-sky-500/30 text-sky-500 hover:bg-sky-500/10 hover:text-sky-400"
              onClick={handleSchedule}
              disabled={!selectedDate || isPending}
            >
              {isPendingSchedule ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CalendarClock className="size-3.5" />
              )}
              {isScheduled ? "Update Schedule" : "Schedule"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
