
import { getPostBySlug } from "@/app/dashboard/blogs/actions"
import { getSession } from "@/lib/session"
import { redirect, notFound } from "next/navigation"
import { Role, ADMIN_ROLES } from "@/lib/roles"
import Link from "next/link"
import { ArrowLeft, Edit, Calendar, User, Tag, Globe, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PostPreviewPage({ params }: PageProps) {
  const user = await getSession()
  if (!user) redirect("/")

  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) notFound()

  const canEdit = (ADMIN_ROLES as readonly Role[]).includes(user.role as Role) || user.id === post.author?.id
  const categories = post.categories ?? []

  return (
    <div className="min-h-screen bg-background">
      {/* Preview banner */}
      <div className="sticky top-0 z-50 w-full backdrop-blur-sm border-b ">
        <div className="max-w-4xl mx-auto px-6 h-11 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-white text-xs font-semibold">
            {post.published ? (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-1 rounded-full">
                <Globe className="size-3" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-200 border border-yellow-400/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="size-3" /> Draft — not publicly visible
              </span>
            )}
            <span className="text-indigo-200 hidden sm:inline">Preview mode</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-indigo-100 hover:text-white hover:bg-indigo-500/40 gap-1.5"
            >
              <Link href="/dashboard/blogs">
                <ArrowLeft className="size-3.5" />
                Back to Blogs
              </Link>
            </Button>
            {canEdit && (
              <Button
                asChild
                size="sm"
                className="h-7 text-xs bg-white text-indigo-700 hover:bg-indigo-50 font-semibold gap-1.5"
              >
                <Link href={`/dashboard/blogs/${post.id}/edit`}>
                  <Edit className="size-3.5" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((c) => (
              <span
                key={c.categoryId}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full"
              >
                <Tag className="size-2.5" />
                {c.category.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-6">
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-10 pb-8 border-b border-border/60">
          <span className="flex items-center gap-1.5 font-medium">
            <User className="size-3.5 text-muted-foreground/60" />
            {post.author?.name || post.author?.email || "Unknown Author"}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <Calendar className="size-3.5 text-muted-foreground/60" />
            {new Date(post.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-border/40 bg-muted/20 mb-12 shadow-md">
            <img
              src={post.featuredImage.url}
              alt={post.title}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Body HTML */}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <style>{`
          .article-body {
            color: hsl(var(--foreground) / 0.9);
            font-size: 1.0625rem;
            line-height: 1.8;
            word-break: break-word;
          }
          .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
            font-weight: 800;
            letter-spacing: -0.025em;
            color: hsl(var(--foreground));
            margin: 2rem 0 0.75rem;
            line-height: 1.25;
          }
          .article-body h1 { font-size: 2rem; }
          .article-body h2 { font-size: 1.5rem; border-bottom: 1px solid hsl(var(--border) / 0.6); padding-bottom: 0.4rem; }
          .article-body h3 { font-size: 1.25rem; }
          .article-body p { margin: 1.25rem 0; }
          .article-body a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 4px; }
          .article-body strong, .article-body b { font-weight: 700; color: hsl(var(--foreground)); }
          .article-body em, .article-body i { font-style: italic; }
          .article-body ul { list-style: disc; padding-left: 1.5rem; margin: 1rem 0; }
          .article-body ol { list-style: decimal; padding-left: 1.5rem; margin: 1rem 0; }
          .article-body li { margin: 0.35rem 0; }
          .article-body blockquote {
            border-left: 4px solid hsl(var(--primary) / 0.4);
            padding: 0.5rem 0 0.5rem 1.25rem;
            margin: 1.5rem 0;
            color: hsl(var(--muted-foreground));
            font-style: italic;
          }
          .article-body code {
            background: hsl(var(--muted));
            padding: 0.15rem 0.45rem;
            border-radius: 0.3rem;
            font-size: 0.875em;
            font-family: ui-monospace, monospace;
          }
          .article-body pre {
            background: hsl(var(--muted));
            padding: 1rem 1.25rem;
            border-radius: 0.75rem;
            overflow-x: auto;
            font-size: 0.875em;
            margin: 1.5rem 0;
          }
          .article-body pre code { background: none; padding: 0; }
          .article-body hr { border: none; border-top: 1px solid hsl(var(--border) / 0.6); margin: 2.5rem 0; }
          .article-body img { border-radius: 0.75rem; max-width: 100%; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin: 1.5rem 0; }
          .article-body table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
          .article-body th {
            background: hsl(var(--muted));
            font-weight: 600;
            text-align: left;
            padding: 0.6rem 1rem;
            border: 1px solid hsl(var(--border));
            color: hsl(var(--foreground));
          }
          .article-body td {
            padding: 0.55rem 1rem;
            border: 1px solid hsl(var(--border));
            color: hsl(var(--foreground));
          }
          .article-body tr:nth-child(even) td {
            background: hsl(var(--muted) / 0.4);
          }
        `}</style>

       
      </article>
    </div>
  )
}
