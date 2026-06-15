import { getPosts, deletePost } from "./actions"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Plus, Calendar, Eye, Heart, MessageSquare, Edit, Trash2, CheckCircle2, AlertTriangle, BookOpen, User
} from "lucide-react"
import { revalidatePath } from "next/cache"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function BlogsPage() {
  const user = await getSession()
  if (!user) redirect("/")

  const posts = await getPosts()

  async function handleDelete(formData: FormData) {
    "use server"
    const id = formData.get("id") as string
    if (id) {
      await deletePost(id)
      revalidatePath("/dashboard/blogs")
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 py-3">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-foreground">
            Blogs
          </h1>
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

      {/* Main content grid */}
      {posts.length === 0 ? (
        <div className="min-h-[400px] rounded-2xl border border-dashed border-border/80 bg-muted/10 flex flex-col justify-center items-center text-center p-8 backdrop-blur-xs">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-inner">
            <BookOpen className="size-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">No Articles Yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm mb-6">
            Get started by composing your very first article using the rich text editor.
          </p>
          <Button asChild className="font-semibold shadow-sm">
            <Link href="/dashboard/blogs/new">
              Create First Post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const tags = (post.metadata as any)?.tags || []
            
            return (
              <Card
                key={post.id}
                className="group relative flex flex-col border border-border/60 bg-card/45 hover:border-border hover:bg-card/85 shadow-xs hover:shadow-md transition-all duration-350 overflow-hidden rounded-xl"
              >
                {/* Featured Image Canvas */}
                <div className="relative aspect-video bg-muted/30 overflow-hidden border-b border-border/40">
                  {post.featuredImage ? (
                    <img
                      src={post.featuredImage.url}
                      alt={post.title}
                      className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/5 to-accent/20">
                      <BookOpen className="size-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Status Badge overlays */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm border ${
                      post.published
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 backdrop-blur-md"
                        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 backdrop-blur-md"
                    }`}>
                      {post.published ? (
                        <>
                          <CheckCircle2 className="size-3" /> Published
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="size-3" /> Draft
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-transparent">
                  <div className="space-y-2.5">
                    {/* Categories Tags */}
                    {post.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.categories.map((c) => (
                          <span
                            key={c.categoryId}
                            className="text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border/40 px-2 py-0.5 rounded-md"
                          >
                            {c.category.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="font-bold text-base leading-snug line-clamp-2 tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {(post.metadata as any)?.seoDescription || "No metadata description provided."}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/60">
                    {/* Author & Timestamp */}
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span className="font-semibold flex items-center gap-1 max-w-[140px] truncate text-muted-foreground/80">
                        <User className="size-3 text-muted-foreground/75" />
                        {post.author.name || post.author.email}
                      </span>
                      <span className="flex items-center gap-1 shrink-0 font-mono text-muted-foreground/80">
                        <Calendar className="size-3 text-muted-foreground/75" />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Interaction Counts & Edit/Delete Tools */}
                    <div className="flex justify-between items-center pt-1">
                      <div className="flex items-center gap-3.5 text-xs font-semibold text-muted-foreground/80">
                        <span className="flex items-center gap-1" title="Total Views">
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

                      <div className="flex items-center gap-1 border border-border/80 rounded-lg p-0.5 bg-muted/30">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md hover:bg-muted"
                          asChild
                          title="Edit Post"
                        >
                          <Link href={`/dashboard/blogs/${post.id}/edit`}>
                            <Edit className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Link>
                        </Button>

                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={post.id} />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="submit"
                            title="Delete Post"
                            className="size-7 rounded-md hover:bg-destructive/10 group/del"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground group-hover/del:text-destructive" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
