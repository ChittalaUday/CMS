import { EditorialEditor } from "@/components/EditorialEditor"
import { createPost } from "../actions"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function NewBlogPage() {
  const user = await getSession()
  if (!user) redirect("/")

  const handleSubmit = async (data: any) => {
    "use server"
    await createPost(data)
  }

  // Ensure role is formatted correctly for props
  const propUser = {
    name: user.name,
    email: user.email,
    role: user.role,
  }

  return <EditorialEditor user={propUser} onSubmit={handleSubmit} />
}
