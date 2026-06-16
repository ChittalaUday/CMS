import { getPostsPaginated, deletePost, getCategories } from "./actions"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import {
  Plus, Calendar, Eye, Heart, MessageSquare, Edit, Trash2,
  CheckCircle2, AlertTriangle, BookOpen, User, MoreHorizontal,
} from "lucide-react"
import { revalidatePath } from "next/cache"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BlogsToolbar } from "./BlogsToolbar"
import { BlogsPagination } from "./BlogsPagination"
import { PublishButton } from "./PublishButton"
import { PostMetaHoverCard } from "./PostMetaHoverCard"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ search?: string; categoryId?: string; page?: string }>
}

export default async function BlogsPage({ searchParams }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")

  const canPublish = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

  const params = await searchParams
  const search = params.search ?? ""
  const categoryId = params.categoryId ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  const [{ posts, totalCount, totalPages }, categories] = await Promise.all([
    getPostsPaginated({ search, categoryId, page, pageSize: 15 }),
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
          <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
            <div className="bg-card/40 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[40%]">
                    Article
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Author
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Stats
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {posts.map((post) => {
                  const seoDesc = (post.metadata as any)?.seoDescription || ""
                  const tags: string[] = (post.metadata as any)?.tags || []

                  return (
                    <tr
                      key={post.id}
                      className="group hover:bg-muted/20 transition-colors duration-150"
                    >
                      {/* Title */}
                      <td className="px-5 py-4">
                        <PostMetaHoverCard
                          slug={post.slug}
                          seoDescription={seoDesc}
                          tags={tags}
                          categories={post.categories}
                        >
                          <div className="flex items-start gap-3 cursor-default">
                            <div className="size-10 rounded-lg overflow-hidden border border-border/50 bg-muted/40 shrink-0 flex items-center justify-center">
                              {post.featuredImage ? (
                                <img
                                  src={post.featuredImage.url}
                                  alt={post.title}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <BookOpen className="size-4 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              {post.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {post.categories.slice(0, 2).map((c) => (
                                    <span
                                      key={c.categoryId}
                                      className="text-[9px] font-bold uppercase tracking-wider bg-primary/8 text-primary/80 border border-primary/15 px-1.5 py-px rounded"
                                    >
                                      {c.category.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="font-semibold text-foreground text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                                {post.title}
                              </p>
                              {seoDesc && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {seoDesc}
                                </p>
                              )}
                            </div>
                          </div>
                        </PostMetaHoverCard>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            post.published
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                          }`}
                        >
                          {post.published ? (
                            <><CheckCircle2 className="size-3" /> Published</>
                          ) : (
                            <><AlertTriangle className="size-3" /> Draft</>
                          )}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium max-w-[130px] truncate">
                          <User className="size-3 shrink-0 text-muted-foreground/60" />
                          {post.author.name || post.author.email}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Calendar className="size-3 text-muted-foreground/60" />
                          {new Date(post.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground/80">
                          <span className="flex items-center gap-1" title="Views">
                            <Eye className="size-3.5 text-muted-foreground/50" />
                            {post._count.views}
                          </span>
                          <span className="flex items-center gap-1" title="Likes">
                            <Heart className="size-3.5 text-muted-foreground/50" />
                            {post._count.likes}
                          </span>
                          <span className="flex items-center gap-1" title="Comments">
                            <MessageSquare className="size-3.5 text-muted-foreground/50" />
                            {post._count.comments}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 sm:px-4 py-4">
                        <div className="flex items-center justify-end gap-1">

                          {/* Preview + Publish — hidden on mobile, shown sm+ */}
                          <div className="hidden sm:contents">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-muted"
                              title="Preview post"
                              asChild
                            >
                              <a
                                href={`/posts/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="size-3.5 text-muted-foreground" />
                              </a>
                            </Button>

                            {canPublish && (
                              <PublishButton
                                postId={post.id}
                                postTitle={post.title}
                                isPublished={post.published}
                              />
                            )}
                          </div>

                          {/* ⋯ dropdown — Edit + Delete */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg data-[state=open]:opacity-100 hover:bg-muted"
                              >
                                <MoreHorizontal className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 text-sm">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/blogs/${post.id}/edit`}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="size-3.5 text-muted-foreground" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <form action={handleDelete} className="w-full">
                                  <input type="hidden" name="id" value={post.id} />
                                  <button
                                    type="submit"
                                    className="w-full flex items-center gap-2 text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                    Delete
                                  </button>
                                </form>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          <Suspense>
            <BlogsPagination page={page} totalPages={totalPages} pageSize={15} />
          </Suspense>
        </>
      )}
    </div>
  )
}
