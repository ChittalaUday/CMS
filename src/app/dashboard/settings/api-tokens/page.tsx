import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Role } from "@/lib/roles"
import { listApiTokens } from "@/app/_actions/api-tokens"
import { API_REGISTRY } from "@/lib/api-registry"
import { ApiTokensManager } from "./ApiTokensManager"

export const dynamic = "force-dynamic"

export default async function ApiTokensPage() {
  const user = await getSession()
  if (!user) redirect("/")
  // ADMIN only — SUPER_ADMIN manages tokens in Clients > API Keys
  if (user.role !== Role.ADMIN) redirect("/dashboard/settings/profile")

  const tokens = await listApiTokens()
  const hasClient = !!user.clientId

  return (
    <ApiTokensManager
      tokens={tokens}
      registry={API_REGISTRY}
      hasClient={hasClient}
    />
  )
}
