"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SaveIcon, FileText, Loader2 } from "lucide-react"

interface JobFormFooterProps {
  step: 1 | 2 | 3 | 4
  isEdit: boolean
  jobStatus?: "DRAFT" | "PUBLISHED" | "CLOSED"
  isPending: boolean
  isSavingDraft: boolean
  handleSaveDraft: () => void
  handleSubmit: (targetStatus: "DRAFT" | "PUBLISHED") => void
  goBack: () => void
  goNext: () => void
  onCancel: () => void
}

export function JobFormFooter({
  step,
  isEdit,
  jobStatus,
  isPending,
  isSavingDraft,
  handleSaveDraft,
  handleSubmit,
  goBack,
  goNext,
  onCancel
}: JobFormFooterProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/40">
      <Button
        variant="outline"
        onClick={step === 1 ? onCancel : goBack}
        className="h-9 text-sm gap-1.5"
        disabled={isPending}
      >
        <ChevronLeft className="size-4" />
        {step === 1 ? "Cancel" : "Back"}
      </Button>

      <div className="flex items-center gap-2">
        {/* Save Draft — always available except on last step if published */}
        {step < 4 && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 border-border/60"
            onClick={handleSaveDraft}
            disabled={isPending || isSavingDraft}
            title="Save current progress as draft"
          >
            {isSavingDraft && isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            Save Draft
          </Button>
        )}

        {step < 4 ? (
          <Button onClick={goNext} className="h-9 text-sm gap-1.5 font-semibold shadow-sm" disabled={isPending}>
            Continue <ChevronRight className="size-4" />
          </Button>
        ) : (
          <>
            {(!isEdit || jobStatus !== "PUBLISHED") && (
              <Button
                variant="outline"
                onClick={() => handleSubmit("DRAFT")}
                className="h-9 text-sm gap-1.5 font-semibold shadow-sm"
                disabled={isPending}
              >
                <SaveIcon className="size-4" /> Save Draft
              </Button>
            )}
            <Button
              onClick={() => handleSubmit("PUBLISHED")}
              className="h-9 text-sm gap-1.5 font-semibold shadow-sm min-w-35"
              disabled={isPending}
            >
              {isPending && !isSavingDraft ? (
                <><Loader2 className="size-4 animate-spin" />Saving…</>
              ) : (
                <><FileText className="size-4" />{isEdit && jobStatus === "PUBLISHED" ? "Save Changes" : "Publish Job"}</>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
