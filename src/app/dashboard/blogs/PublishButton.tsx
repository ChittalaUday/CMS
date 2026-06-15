"use client"

import { useTransition, useState } from "react"
import { Globe, Upload, Loader2 } from "lucide-react"
import { togglePublished } from "./actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
}

export function PublishButton({ postId, postTitle, isPublished }: PublishButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await togglePublished(postId)
        toast.success(
          isPublished
            ? `"${postTitle}" moved back to Draft`
            : `"${postTitle}" is now Published`
        )
        setOpen(false)
      } catch (err: any) {
        toast.error(err.message || "Failed to update publish status")
        setOpen(false)
      }
    })
  }

  return (
    <TooltipProvider>
      <AlertDialog open={open} onOpenChange={setOpen}>

        {/* Icon trigger wrapped in tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <button
                disabled={isPending}
                className={`size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-50 ${
                  isPublished
                    ? "text-emerald-500 hover:text-emerald-600"
                    : "text-muted-foreground/50 hover:text-emerald-500"
                }`}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isPublished ? (
                  <Globe className="size-3.5" />
                ) : (
                  <Upload className="size-3.5" />
                )}
              </button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isPublished ? "Unpublish" : "Publish"}
          </TooltipContent>
        </Tooltip>

        {/* Confirmation dialog */}
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPublished ? "Unpublish this article?" : "Publish this article?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {isPublished ? (
                <>
                  <span className="font-semibold text-foreground">"{postTitle}"</span> will be moved
                  back to <span className="font-semibold text-yellow-600 dark:text-yellow-400">Draft</span> and
                  hidden from public view immediately.
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">"{postTitle}"</span> will be made{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">publicly visible</span>{" "}
                  immediately. Make sure the content is ready before publishing.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className={
                isPublished
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              {isPublished ? "Yes, Unpublish" : "Yes, Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>

      </AlertDialog>
    </TooltipProvider>
  )
}
