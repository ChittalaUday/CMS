import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface EditBlogPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const { id } = await params
  redirect(`/editor?id=${id}`)
}
