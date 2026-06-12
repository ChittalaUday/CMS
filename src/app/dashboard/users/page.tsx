import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { getEditors } from "@/app/_actions/users"
import { UserList } from "./UserList"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const user = await getSession()
  
  if (!user) {
    redirect("/")
  }

  // Double check authorization
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch editor list
  const editors = await getEditors()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, create new credentials, and view system access.
        </p>
      </div>
      
      <UserList initialEditors={editors} currentUserRole={user.role} />
    </div>
  )
}
