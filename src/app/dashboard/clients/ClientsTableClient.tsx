"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { suspendClient, deleteClient } from "./actions"
import { toast } from "sonner"
import {
  MoreHorizontal, Search, PlusCircle, Building2,
  Eye, Pencil, Ban, CheckCircle2, Trash2,
} from "lucide-react"
import Link from "next/link"
import { useDebounce } from "@/hooks/use-debounce"
import { useEffect } from "react"

type ClientStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE"

type Client = {
  id: string
  name: string
  slug: string
  domain: string | null
  status: ClientStatus
  createdAt: Date
  _count: { users: number; posts: number; apiKeys: number }
}

const STATUS_BADGE: Record<ClientStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  SUSPENDED: { label: "Suspended", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  INACTIVE: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
}

type Props = {
  clients: Client[]
  totalCount: number
  totalPages: number
  currentPage: number
  currentSearch: string
  currentStatus: string
}

export function ClientsTableClient({
  clients,
  totalCount,
  totalPages,
  currentPage,
  currentSearch,
  currentStatus,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(currentSearch)
  const debouncedSearch = useDebounce(search, 300)

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedSearch) { params.set("search", debouncedSearch); params.delete("page") }
    else params.delete("search")
    router.replace(`${pathname}?${params.toString()}`)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams)
    if (status && status !== "all") params.set("status", status)
    else params.delete("status")
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(page))
    router.replace(`${pathname}?${params.toString()}`)
  }

  function handleSuspend(client: Client) {
    const suspend = client.status === "ACTIVE"
    startTransition(async () => {
      await suspendClient(client.id, suspend)
      toast.success(`Client ${suspend ? "suspended" : "reactivated"}.`)
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteClient(deleteTarget.id)
      toast.success("Client deleted.")
      setDeleteTarget(null)
    })
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "ACTIVE", "SUSPENDED", "INACTIVE"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={currentStatus === s || (!currentStatus && s === "all") ? "default" : "outline"}
              onClick={() => setStatus(s === "all" ? "" : s)}
              className="h-8 text-xs"
            >
              {s === "all" ? "All" : STATUS_BADGE[s]?.label ?? s}
            </Button>
          ))}
        </div>
        <Button size="sm" asChild className="ml-auto">
          <Link href="/dashboard/clients/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Client
          </Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No clients found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentSearch ? "Try a different search term" : "Create your first client to get started"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Slug</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Domain</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Users</th>
                <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">Posts</th>
                <th className="px-4 py-3 text-right font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const { label, className } = STATUS_BADGE[client.status]
                return (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/clients/${client.id}`} className="hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {client.slug}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {client.domain ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={className}>{label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">
                      {client._count.users}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">
                      {client._count.posts}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/clients/${client.id}`}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/clients/${client.id}?tab=settings`}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleSuspend(client)} disabled={pending}>
                            {client.status === "ACTIVE" ? (
                              <><Ban className="h-4 w-4 mr-2" /> Suspend</>
                            ) : (
                              <><CheckCircle2 className="h-4 w-4 mr-2" /> Reactivate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(client)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalCount} client{totalCount !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              Previous
            </Button>
            <span className="flex items-center px-2">{currentPage} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
