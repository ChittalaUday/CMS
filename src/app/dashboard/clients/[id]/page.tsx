import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getClientStats, listApiKeys } from "../actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ClientForm } from "../ClientForm"
import { ApiKeyManager } from "../ApiKeyManager"
import { ArrowLeft, Users, FileText, Briefcase, BarChart3 } from "lucide-react"
import Link from "next/link"
import { suspendClient, deleteClient, removeUserFromClient } from "../actions"
import { redirect as nextRedirect } from "next/navigation"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  SUSPENDED: { label: "Suspended", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  INACTIVE: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  HR: { label: "HR", className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  EDITOR: { label: "Editor", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {

  const { id } = await params
  const { tab } = await searchParams

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      users: {
        where: { role: { not: "SUPER_ADMIN" } },
        select: { id: true, name: true, email: true, role: true, onboardingCompleted: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!client) notFound()

  const [stats, apiKeys] = await Promise.all([
    getClientStats(id),
    listApiKeys(id),
  ])

  const { label: statusLabel, className: statusClass } = STATUS_BADGE[client.status] ?? STATUS_BADGE.INACTIVE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 self-start" asChild>
          <Link href="/dashboard/clients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{client.slug}</p>
        </div>
      </div>

      <Tabs defaultValue={tab ?? "overview"}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({client.users.length})</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys ({apiKeys.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Users", value: stats.userCount, icon: Users },
              { label: "Published Posts", value: stats.postCount, icon: FileText },
              { label: "Open Jobs", value: stats.jobCount, icon: Briefcase },
              { label: "Applications (MTD)", value: stats.applicationCount, icon: BarChart3 },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Client Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{client.name}</span>
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono">{client.slug}</span>
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
              {client.description && (
                <p className="text-muted-foreground border-t pt-3">{client.description}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{client.users.length} user{client.users.length !== 1 ? "s" : ""}</p>
            <Button size="sm" asChild>
              <Link href={`/dashboard/users?clientId=${id}`}>Invite User</Link>
            </Button>
          </div>

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
                          <RemoveUserButton userId={u.id} clientId={id} />
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
        <TabsContent value="api-keys" className="mt-6">
          <ApiKeyManager clientId={id} initialKeys={apiKeys} />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="mt-6 space-y-8">
          <div>
            <h3 className="text-base font-semibold mb-4">Edit Client</h3>
            <ClientForm
              clientId={id}
              defaultValues={{
                name: client.name,
                slug: client.slug,
                domain: client.domain ?? undefined,
                description: client.description ?? undefined,
                logoUrl: client.logoUrl ?? undefined,
              }}
            />
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <SuspendButton clientId={id} currentStatus={client.status} />
              <DeleteButton clientId={id} clientName={client.name} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Small inline client components ───────────────────────────────────────────

function RemoveUserButton({ userId, clientId }: { userId: string; clientId: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove user from client?</AlertDialogTitle>
          <AlertDialogDescription>
            This user will lose access to this client's data but their account will not be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={async () => {
            "use server"
            await removeUserFromClient(userId)
            nextRedirect(`/dashboard/clients/${clientId}?tab=users`)
          }}>
            <AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SuspendButton({ clientId, currentStatus }: { clientId: string; currentStatus: string }) {
  const isSuspended = currentStatus === "SUSPENDED"
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className={isSuspended ? "" : "border-amber-500 text-amber-600 hover:bg-amber-50"}>
          {isSuspended ? "Reactivate Client" : "Suspend Client"}
        </Button>
      </AlertDialogTrigger>
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
          <form action={async () => {
            "use server"
            await suspendClient(clientId, !isSuspended)
            nextRedirect(`/dashboard/clients/${clientId}?tab=settings`)
          }}>
            <AlertDialogAction type="submit">
              {isSuspended ? "Reactivate" : "Suspend"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/5">
          Delete Client
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {clientName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this client and all its associated data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={async () => {
            "use server"
            await deleteClient(clientId)
            nextRedirect("/dashboard/clients")
          }}>
            <AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
