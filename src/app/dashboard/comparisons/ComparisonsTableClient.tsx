"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, CheckCircle2, EyeOff, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  deleteComparisonAction,
  reorderComparisonAction,
  togglePublishComparisonAction,
} from "./actions"

export interface ComparisonRow {
  id: string
  title: string
  slug: string
  published: boolean
  updatedAt: Date | string
  _count: { options: number; criteria: number }
}

interface Props {
  comparisons: ComparisonRow[]
  canDelete: boolean
  /** Reordering is only meaningful in the full, unfiltered list. */
  canReorder: boolean
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" })

export function ComparisonsTableClient({ comparisons, canDelete, canReorder }: Props) {
  const router = useRouter()
  const [toDelete, setToDelete] = useState<ComparisonRow | null>(null)

  const onError = ({ error }: { error: { serverError?: string } }) =>
    toast.error(error.serverError ?? "Something went wrong")

  const publish = useAction(togglePublishComparisonAction, {
    onSuccess: ({ data }) => toast.success(data?.published ? "Comparison published" : "Comparison unpublished"),
    onError,
  })
  const move = useAction(reorderComparisonAction, { onError })
  const remove = useAction(deleteComparisonAction, {
    onSuccess: () => {
      toast.success("Comparison deleted")
      setToDelete(null)
    },
    onError,
  })

  const busy = publish.isPending || move.isPending

  return (
    <>
      <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
        <div className="bg-card/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-3 sm:px-4 py-3 font-medium">Comparison</th>
                <th className="px-3 sm:px-4 py-3 font-medium hidden md:table-cell">Grid</th>
                <th className="px-3 sm:px-4 py-3 font-medium hidden lg:table-cell">Updated</th>
                <th className="px-3 sm:px-4 py-3 font-medium">Status</th>
                <th className="px-3 sm:px-4 py-3 w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {comparisons.map((c, i) => (
                <tr
                  key={c.id}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => router.push(`/dashboard/comparisons/${c.id}/edit`)}
                >
                  <td className="px-3 sm:px-4 py-4 min-w-0">
                    <Link
                      href={`/dashboard/comparisons/${c.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-foreground hover:underline line-clamp-2"
                    >
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate max-w-[16rem] sm:max-w-md">/{c.slug}</p>
                  </td>
                  <td className="px-3 sm:px-4 py-4 hidden md:table-cell text-muted-foreground">
                    {c._count.options} columns × {c._count.criteria} rows
                  </td>
                  <td className="px-3 sm:px-4 py-4 hidden lg:table-cell text-muted-foreground">
                    {dateFmt.format(new Date(c.updatedAt))}
                  </td>
                  <td className="px-3 sm:px-4 py-4">
                    <Badge
                      variant="outline"
                      className={
                        c.published
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted/60 text-muted-foreground border-border/60"
                      }
                    >
                      {c.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-3 sm:px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${c.title}`}>
                          {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/comparisons/${c.id}/edit`}>
                            <Pencil className="size-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={busy}
                          onSelect={() => publish.execute({ id: c.id, published: !c.published })}
                        >
                          {c.published ? <EyeOff className="size-4" /> : <CheckCircle2 className="size-4" />}
                          {c.published ? "Unpublish" : "Publish"}
                        </DropdownMenuItem>
                        {canReorder && (
                          <>
                            <DropdownMenuItem
                              disabled={busy || i === 0}
                              onSelect={() => move.execute({ id: c.id, direction: "up" })}
                            >
                              <ArrowUp className="size-4" /> Move up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={busy || i === comparisons.length - 1}
                              onSelect={() => move.execute({ id: c.id, direction: "down" })}
                            >
                              <ArrowDown className="size-4" /> Move down
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(c)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comparison?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toDelete?.title}&rdquo; and its whole table will be removed, and your website will stop
              receiving it from the API. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (toDelete) remove.execute({ id: toDelete.id })
              }}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
