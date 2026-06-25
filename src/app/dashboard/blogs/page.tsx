import { getPostsPaginated, deletePost, getCategories } from "./actions"
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { Role, ADMIN_ROLES } from "@/lib/auth/roles"
import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus, BookOpen } from "lucide-react"
import { revalidatePath } from "next/cache"
import { BlogsToolbar } from "./BlogsToolbar"
import { BlogsPagination } from "./BlogsPagination"
import { BlogsTableClient } from "./BlogsTableClient"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ search?: string; categoryId?: string; status?: string; page?: string; showEditorDrafts?: string }>
}

export default async function BlogsPage({ searchParams }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")
  if (user.role === Role.HR) redirect("/dashboard/careers")

  const canPublish = (ADMIN_ROLES as readonly Role[]).includes(user.role)

  const params = await searchParams
  const search = params.search ?? ""
  const categoryId = params.categoryId ?? ""
  const status = params.status ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const showEditorDrafts = params.showEditorDrafts === "1" && canPublish

  const [{ posts, totalCount, totalPages }, categories] = await Promise.all([
    getPostsPaginated({ search, categoryId, status, page, pageSize: 15, showEditorDrafts }),
    getCategories(),
  ])

  async function handleDelete(formData: FormData) {
    "use server"
    const id = formData.get("id") as string
    if (id) {
      await deletePost(id)
      revalidatePath("/dashboard/blogs")
    }
  }

  return (
    <div className="space-y-5 w-full px-1 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Blogs</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Create, publish, edit, and monitor analytics of your articles in the CMS portal.
          </p>
        </div>
        <Button asChild className="gap-2 shadow-md hover:shadow-lg transition-all font-semibold h-10 bg-primary text-primary-foreground">
          <Link href="/dashboard/blogs/new">
            <Plus className="size-4" />
            Write Article
          </Link>
        </Button>
      </div>

      {/* Toolbar */}
      <Suspense>
        <BlogsToolbar
          categories={categories ?? []}
          totalCount={totalCount}
          search={search}
          categoryId={categoryId}
          status={status}
          showEditorDrafts={showEditorDrafts}
          canToggleEditorDrafts={canPublish}
        />
      </Suspense>

      {/* Empty state */}
      {posts.length === 0 ? (
        <div className="min-h-[360px] rounded-2xl border border-dashed border-border/80 bg-muted/10 flex flex-col justify-center items-center text-center p-8">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-inner">
            <BookOpen className="size-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            {search || categoryId ? "No matching articles" : "No Articles Yet"}
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm mb-6">
            {search || categoryId
              ? "Try adjusting your search or filter."
              : "Get started by composing your very first article using the rich text editor."}
          </p>
          {!search && !categoryId && (
            <Button asChild className="font-semibold shadow-sm">
              <Link href="/dashboard/blogs/new">Create First Post</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <BlogsTableClient
            posts={posts as any}
            canPublish={canPublish}
            showEditorDrafts={showEditorDrafts}
            currentUserId={user.id}
            handleDelete={handleDelete}
          />

          {/* Pagination */}
          <Suspense>
            <BlogsPagination page={page} totalPages={totalPages} pageSize={15} />
          </Suspense>
        </>
      )}
    </div>
  )
}
