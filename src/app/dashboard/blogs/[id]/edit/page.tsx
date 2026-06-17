import { getPostById, updatePost, type PostInput } from "../../actions"
import { EditorialEditor } from "@/components/EditorialEditor"
import { getSession } from "@/lib/session"
import { redirect, notFound } from "next/navigation"
import { Role } from "@/lib/roles"

export const dynamic = "force-dynamic"

interface EditBlogPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const { id } = await params
  const user = await getSession()
  if (!user) redirect("/")
  if (user.role === Role.HR) redirect("/dashboard/careers")

  const post = await getPostById(id)
  if (!post) notFound()

  const handleSubmit = async (data: PostInput) => {
    "use server"
    await updatePost(id, data)
  }

  // Map database properties to expected initialData format
  const initialData = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    contentJson: post.contentJson,
    published: post.published,
    featuredImageId: post.featuredImageId,
    featuredImage: post.featuredImage ? {
      url: post.featuredImage.url,
      filename: post.featuredImage.filename,
    } : null,
    categories: post.categories,
    metadata: post.metadata || {},
  }

  // Ensure role is formatted correctly for props
  const propUser = {
    name: user.name,
    email: user.email,
    role: user.role,
  }

  return <EditorialEditor initialData={initialData} user={propUser} onSubmit={handleSubmit} />
}
