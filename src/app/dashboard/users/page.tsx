import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Role, ADMIN_ROLES } from "@/lib/roles"
import { getEditorsPaginated } from "@/app/_actions/users"
import { UserList } from "./UserList"

type PageProps = {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>
}

export const dynamic = "force-dynamic"

export default async function UsersPage({ searchParams }: PageProps) {
  const user = await getSession()

  if (!user) {
    redirect("/")
  }

  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const search = params.search ?? ""
  const role = params.role ?? "all"
  const page = Number(params.page ?? "1") || 1
  const pageSize = 15

  const { editors, totalCount, totalPages } = await getEditorsPaginated({
    search,
    role,
    page,
    pageSize,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, create new credentials, and view system access.
        </p>
      </div>
      
      <UserList
        initialEditors={editors}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        currentRole={role}
        currentUserRole={user.role}
      />
    </div>
  )
}
