import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { API_REGISTRY } from "@/lib/utils/api-registry"
import { ApiDocsPage } from "./ApiDocsPage"

export const metadata = { title: "API Documentation" }

export default async function ApiDocs() {
  const user = await getSession()
  if (!user) redirect("/")

  return <ApiDocsPage registry={API_REGISTRY} />
}
