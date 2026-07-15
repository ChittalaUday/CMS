"use client"

import { useState, useTransition, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2, PlusCircle, ArrowLeft, Search, MoreHorizontal,
  Users, FileText, Briefcase, BarChart3,
  Ban, CheckCircle2, Trash2, Pencil, Eye, Loader2,
} from "lucide-react"
import {
  getClientsPaginated,
  getClientById,
  getClientStats,
  listApiKeys,
  suspendClient,
  deleteClient,
  removeUserFromClient,
} from "./actions"
import { ClientForm } from "./ClientForm"
import { ApiKeyManager } from "./ApiKeyManager"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"
import { cn } from "@/lib/utils/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE"

type ClientRow = {
  id: string
  name: string
  slug: string
  domain: string | null
  status: ClientStatus
  createdAt: Date
  _count: { users: number; posts: number; apiKeys: number }
}

type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientById>>>
type Stats = Awaited<ReturnType<typeof getClientStats>>
type ApiKeyList = Awaited<ReturnType<typeof listApiKeys>>

type View =
  | { type: "list" }
  | { type: "new" }
  | { type: "detail"; id: string }
  | { type: "edit"; id: string; client: ClientDetail }

const STATUS_BADGE: Record<ClientStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  SUSPENDED: { label: "Suspended", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  INACTIVE: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  HR: { label: "HR", className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  EDITOR: { label: "Editor", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  triggerClassName?: string
}

export function ClientManagerDialog({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>({ type: "list" })

  function handleOpen() {
    setView({ type: "list" })
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className={cn("w-full justify-start gap-2 h-9 text-sm", triggerClassName)}
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">Manage Clients</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              {view.type !== "list" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setView({ type: "list" })}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="text-base">
                {view.type === "list" && "Client Management"}
                {view.type === "new" && "New Client"}
                {view.type === "detail" && "Client Detail"}
                {view.type === "edit" && `Edit — ${view.client.name}`}
              </DialogTitle>
              {view.type === "list" && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => setView({ type: "new" })}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Client
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {view.type === "list" && (
              <ListView
                onView={(id) => setView({ type: "detail", id })}
              />
            )}
            {view.type === "new" && (
              <ClientForm onSuccess={() => setView({ type: "list" })} />
            )}
            {view.type === "detail" && (
              <DetailView
                id={view.id}
                onDeleted={() => setView({ type: "list" })}
                onEdit={(client) => setView({ type: "edit", id: client.id, client })}
              />
            )}
            {view.type === "edit" && (
              <ClientForm
                clientId={view.id}
                defaultValues={{
                  name: view.client.name,
                  slug: view.client.slug,
                  domain: view.client.domain ?? undefined,
                  description: view.client.description ?? undefined,
                  logoUrl: view.client.logoUrl ?? undefined,
                }}
                onSuccess={() => setView({ type: "detail", id: view.id })}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ onView }: { onView: (id: string) => void }) {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null)
  const [actionPending, startActionTransition] = useTransition()

  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await getClientsPaginated({ search: debouncedSearch, status, page })
      setClients(result.clients as ClientRow[])
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
    })
  }, [debouncedSearch, status, page])

  useEffect(() => { load() }, [load])

  function handleSuspend(client: ClientRow) {
    const suspend = client.status === "ACTIVE"
    startActionTransition(async () => {
      await suspendClient(client.id, suspend)
      toast.success(`Client ${suspend ? "suspended" : "reactivated"}.`)
      load()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startActionTransition(async () => {
      await deleteClient(deleteTarget.id)
      toast.success("Client deleted.")
      setDeleteTarget(null)
      load()
    })
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "ACTIVE", "SUSPENDED", "INACTIVE"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={(status === s || (!status && s === "all")) ? "default" : "outline"}
              onClick={() => { setStatus(s === "all" ? "" : s); setPage(1) }}
              className="h-8 text-xs"
            >
              {s === "all" ? "All" : STATUS_BADGE[s]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No clients found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search term" : "Create your first client to get started"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Users</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const { label, className } = STATUS_BADGE[client.status]
                return (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <button
                        onClick={() => onView(client.id)}
                        className="hover:underline text-left"
                      >
                        {client.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {client.slug}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={className}>{label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                      {client._count.users}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(client.id)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleSuspend(client)} disabled={actionPending}>
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
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{totalCount} client{totalCount !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="flex items-center px-2">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all its data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Detail view ───────────────────────────────────────────────────────────────

function DetailView({
  id,
  onDeleted,
  onEdit,
}: {
  id: string
  onDeleted: () => void
  onEdit: (client: ClientDetail) => void
}) {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyList>([])
  const [isPending, startTransition] = useTransition()
  const [actionPending, startActionTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [removeUserId, setRemoveUserId] = useState<string | null>(null)

  const load = useCallback(() => {
    startTransition(async () => {
      const [c, s, k] = await Promise.all([
        getClientById(id),
        getClientStats(id),
        listApiKeys(id),
      ])
      setClient(c)
      setStats(s)
      setApiKeys(k)
    })
  }, [id])

  useEffect(() => { load() }, [load])

  if (isPending && !client) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) return null

  const { label: statusLabel, className: statusClass } = STATUS_BADGE[client.status as ClientStatus] ?? STATUS_BADGE.INACTIVE
  const isSuspended = client.status === "SUSPENDED"

  function handleSuspendConfirm() {
    startActionTransition(async () => {
      await suspendClient(id, !isSuspended)
      toast.success(isSuspended ? "Client reactivated." : "Client suspended.")
      setSuspendOpen(false)
      load()
    })
  }

  function handleDeleteConfirm() {
    startActionTransition(async () => {
      await deleteClient(id)
      toast.success("Client deleted.")
      setDeleteOpen(false)
      onDeleted()
    })
  }

  function handleRemoveUser() {
    if (!removeUserId) return
    startActionTransition(async () => {
      await removeUserFromClient(removeUserId)
      toast.success("User removed.")
      setRemoveUserId(null)
      load()
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{client.name}</h2>
            <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{client.slug}</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto gap-2" onClick={() => onEdit(client)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({client.users.length})</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys ({apiKeys.length})</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-5 mt-5">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Users", value: stats.userCount, icon: Users },
                { label: "Published Posts", value: stats.postCount, icon: FileText },
                { label: "Open Jobs", value: stats.jobCount, icon: Briefcase },
                { label: "Applications (MTD)", value: stats.applicationCount, icon: BarChart3 },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Client Info</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-0">
              <div className="grid grid-cols-[110px_1fr] gap-y-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{client.name}</span>
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{client.slug}</span>
                <span className="text-muted-foreground">Domain</span>
                <span>{client.domain ?? <span className="text-muted-foreground/50">Not set</span>}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`w-fit ${statusClass}`}>{statusLabel}</Badge>
                <span className="text-muted-foreground">Created</span>
                <span>{client.createdAt.toLocaleDateString()}</span>
                {client.createdBy && (
                  <>
                    <span className="text-muted-foreground">Created by</span>
                    <span>{client.createdBy.name ?? client.createdBy.email}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-5">
          {client.users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-lg text-center">
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No users assigned</p>
              <p className="text-xs text-muted-foreground mt-1">Invite users to add them to this client.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {client.users.map((u) => {
                    const roleBadge = ROLE_BADGE[u.role] ?? { label: u.role, className: "" }
                    return (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{u.name ?? "(No name)"}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={roleBadge.className}>{roleBadge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setRemoveUserId(u.id)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys" className="mt-5">
          <ApiKeyManager clientId={id} initialKeys={apiKeys} />
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger" className="mt-5 space-y-4">
          <p className="text-sm text-muted-foreground">Irreversible actions for this client.</p>
          <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{isSuspended ? "Reactivate Client" : "Suspend Client"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSuspended
                    ? "The client and its users will regain access."
                    : "All API keys will stop working and users will be locked out."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={isSuspended ? "" : "border-amber-500 text-amber-600 hover:bg-amber-50"}
                onClick={() => setSuspendOpen(true)}
              >
                {isSuspended ? "Reactivate" : "Suspend"}
              </Button>
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Client</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes this client and all associated data.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/5"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Remove User confirmation */}
      <AlertDialog open={!!removeUserId} onOpenChange={(o) => !o && setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user from client?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will lose access to this client&apos;s data but their account will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend confirmation */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSuspended ? "Reactivate" : "Suspend"} this client?</AlertDialogTitle>
            <AlertDialogDescription>
              {isSuspended
                ? "The client and its users will regain access."
                : "All API keys will stop working and dashboard users will be locked out."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspendConfirm} disabled={actionPending}>
              {isSuspended ? "Reactivate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all its associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
