import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { Role } from "@/generated/prisma/enums"
import { getClientsPaginated } from "./actions"
import { ClientsTableClient } from "./ClientsTableClient"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) redirect("/dashboard")

  const params = await searchParams
  const search = params.search ?? ""
  const status = params.status ?? ""
  const page = Number(params.page ?? "1") || 1

  const { clients, totalCount, totalPages } = await getClientsPaginated({ search, status, page })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">Manage tenant clients, their users, API keys, and settings.</p>
      </div>

      <ClientsTableClient
        clients={clients}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        currentStatus={status}
      />
    </div>
  )
}
