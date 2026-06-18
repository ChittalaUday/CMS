"use client"

import { Fragment, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  User,
  Activity,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PostMetaHoverCard } from "./PostMetaHoverCard"
import { PublishButton } from "./PublishButton"
import { PublishRevisionButton } from "./PublishRevisionButton"
import { Role } from "@/lib/auth/roles"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Author {
  id: string
  name: string | null
  email: string
  avatarUrl?: string | null
}

interface Category {
  id: string
  name: string
  slug: string
}

interface PostCategory {
  categoryId: string
  category: Category
}

interface FeaturedImage {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface Post {
  id: string
  title: string
  slug: string
  content: string
  published: boolean
  featured: boolean
  createdAt: Date | string
  updatedAt: Date | string
  author: Author | null
  featuredImage: FeaturedImage | null
  categories: PostCategory[]
  metadata: any
  _count: {
    views: number
    likes: number
    comments: number
  }
  drafts?: Post[]
}

interface BlogsTableClientProps {
  posts: Post[]
  canPublish: boolean
  handleDelete: (formData: FormData) => Promise<void>
}

export function BlogsTableClient({ posts, canPublish, handleDelete }: BlogsTableClientProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleToggleFeatured = (postId: string, postTitle: string, currentFeatured: boolean) => {
    startTransition(async () => {
      try {
        const { toggleFeatured } = await import("./actions")
        await toggleFeatured(postId)
        toast.success(
          currentFeatured
            ? `"${postTitle}" is no longer featured`
            : `"${postTitle}" is now featured`
        )
      } catch (err: any) {
        toast.error(err.message || "Failed to update featured status")
      }
    })
  }

  const handleRowClick = (post: Post) => {
    if (!post.published) {
      router.push(`/editor?id=${post.id}`)
    } else {
      setSelectedPost(post)
      setIsSheetOpen(true)
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <>
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
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Featured
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
                const hasDraft = post.published && (post.drafts?.length ?? 0) > 0
                const draft = post.drafts?.[0]

                return (
                  <Fragment key={post.id}>
                    <tr
                      onClick={() => handleRowClick(post)}
                      className="group hover:bg-muted/20 cursor-pointer transition-colors duration-150"
                    >
                      {/* Title */}
                      <td className="px-5 py-4">
                        <PostMetaHoverCard
                          slug={post.slug}
                          seoDescription={seoDesc}
                          tags={tags}
                          categories={post.categories}
                        >
                          <div className="flex items-start gap-3">
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
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border w-fit ${post.published
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

                        </div>
                      </td>

                      {/* Featured */}
                      <td className="px-4 py-4" onClick={handleActionClick}>
                        <div className="flex items-center">
                          <Switch
                            checked={post.featured}
                            disabled={!canPublish || isPending}
                            onCheckedChange={() => handleToggleFeatured(post.id, post.title, post.featured)}
                          />
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium max-w-[130px] truncate">
                          <User className="size-3 shrink-0 text-muted-foreground/60" />
                          {post.author?.name || post.author?.email || "Deleted user"}
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
                      <td className="px-3 sm:px-4 py-4" onClick={handleActionClick}>
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <div className="hidden sm:contents">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg hover:bg-muted"
                                    asChild
                                  >
                                    <a href={`/posts/${post.slug}`} target="_blank" rel="noopener noreferrer">
                                      <Eye className="size-3.5 text-muted-foreground" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Preview post</TooltipContent>
                              </Tooltip>
                              {canPublish && (
                                <PublishButton
                                  postId={post.id}
                                  postTitle={post.title}
                                  isPublished={post.published}
                                />
                              )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent side="top">More actions</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>

                    {/* Draft revision child row */}
                    {hasDraft && draft && (
                      <tr
                        key={`${post.id}-draft`}
                        onClick={() => router.push(`/editor?id=${draft.id}`)}
                        className="bg-amber-500/5 border-l-2 border-amber-400/40 hover:bg-amber-500/10 cursor-pointer transition-colors duration-150"
                      >
                        <td className="pl-16 pr-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <GitBranch className="size-3.5 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground/80 line-clamp-1">
                                {draft.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                Draft revision · last updated {new Date(draft.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            <AlertTriangle className="size-3" /> Pending Review
                          </span>
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 hidden md:table-cell" />
                        <td className="px-4 py-3 hidden lg:table-cell" />
                        <td className="px-4 py-3 hidden lg:table-cell" />
                        <td className="px-3 sm:px-4 py-3" onClick={handleActionClick}>
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              <div className="hidden sm:contents">
                                {canPublish && (
                                  <PublishRevisionButton
                                    draftId={draft.id}
                                    parentTitle={post.title}
                                  />
                                )}
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg hover:bg-muted"
                                    asChild
                                  >
                                    <Link href={`/editor?id=${draft.id}`}>
                                      <Edit className="size-3.5 text-muted-foreground" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit revision</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Preview Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl data-[side=right]:sm:max-w-4xl !sm:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border">
          {selectedPost && (
            <>
              {/* Header section with cover image or header info */}
              <div className="border-b border-border/60 bg-muted/20 px-6 py-5 flex items-center justify-between shrink-0">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${selectedPost.published
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                        }`}
                    >
                      {selectedPost.published ? "Published" : "Draft"}
                    </span>
                    {selectedPost.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        <Star className="size-2.5 fill-amber-500 text-amber-500" /> Featured
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(selectedPost.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <SheetTitle className="text-xl font-bold line-clamp-1">{selectedPost.title}</SheetTitle>
                </div>
                <div className="flex items-center gap-2 mr-8 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                    <a href={`/posts/${selectedPost.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      View Public
                    </a>
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5" asChild>
                    <Link href={`/dashboard/blogs/${selectedPost.id}/edit`}>
                      <Edit className="size-3.5" />
                      Edit Post
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Multi-column Body container */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                {/* Left Side: Article Content Preview */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:border-r border-border/60">
                  {selectedPost.featuredImage && (
                    <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden border border-border/50 relative bg-muted/40">
                      <img
                        src={selectedPost.featuredImage.url}
                        alt={selectedPost.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}

                  {/* Categories */}
                  {selectedPost.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.categories.map((c) => (
                        <span
                          key={c.categoryId}
                          className="text-[10px] font-bold uppercase tracking-wider bg-primary/8 text-primary border border-primary/15 px-2 py-0.5 rounded"
                        >
                          {c.category.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title & Author */}
                  <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                      {selectedPost.title}
                    </h2>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="size-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center overflow-hidden">
                        {selectedPost.author?.avatarUrl ? (
                          <img
                            src={selectedPost.author.avatarUrl}
                            alt={selectedPost.author.name || ""}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <User className="size-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {selectedPost.author?.name || "Deleted User"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedPost.author?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Article content (rich HTML preview) */}
                  <article
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed border-t border-border/40 pt-6"
                    dangerouslySetInnerHTML={{
                      __html: selectedPost.content || "<p className='text-muted-foreground italic'>No content composed yet.</p>",
                    }}
                  />
                </div>

                {/* Right Side: Analytics and Meta Stats */}
                <div className="w-full md:w-[280px] bg-muted/10 overflow-y-auto p-6 space-y-6 shrink-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <BarChart3 className="size-4 text-primary" />
                      Post Statistics
                    </div>

                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
                      {/* Views */}
                      <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col items-start gap-1 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="size-4 text-sky-500" />
                          <span>Views</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight mt-1">
                          {selectedPost._count.views}
                        </span>
                      </div>

                      {/* Likes */}
                      <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col items-start gap-1 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Heart className="size-4 text-rose-500 fill-rose-500/10" />
                          <span>Likes</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight mt-1">
                          {selectedPost._count.likes}
                        </span>
                      </div>

                      {/* Comments */}
                      <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col items-start gap-1 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="size-4 text-violet-500" />
                          <span>Comments</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight mt-1">
                          {selectedPost._count.comments}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional details */}
                  <div className="border-t border-border/60 pt-5 space-y-4 text-xs">
                    <div className="flex items-center gap-2 font-bold text-muted-foreground uppercase tracking-wider">
                      <Activity className="size-4 text-primary" />
                      Metadata Info
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">Slug</span>
                        <span className="font-mono text-[11px] truncate max-w-[150px] font-medium" title={selectedPost.slug}>
                          {selectedPost.slug}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">
                          {new Date(selectedPost.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="font-medium">
                          {new Date(selectedPost.updatedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Tags section */}
                    {((selectedPost.metadata as any)?.tags || []).length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="text-muted-foreground font-semibold">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {((selectedPost.metadata as any)?.tags || []).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-md text-foreground/80 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
