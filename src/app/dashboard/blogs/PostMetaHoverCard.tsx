"use client"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Tag, Link2, FileText, Hash } from "lucide-react"

interface PostMetaHoverCardProps {
  children: React.ReactNode
  slug: string
  seoDescription?: string
  tags?: string[]
  categories?: { categoryId: string; category: { name: string } }[]
}

export function PostMetaHoverCard({
  children,
  slug,
  seoDescription,
  tags = [],
  categories = [],
}: PostMetaHoverCardProps) {
  const hasMeta = seoDescription || tags.length > 0 || categories.length > 0

  // No metadata — just render children as-is
  if (!hasMeta) return <>{children}</>

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>

      <HoverCardContent side="bottom" align="start" className="w-72 p-3.5 space-y-3">

        {/* Slug */}
        <div className="flex items-start gap-2">
          <Link2 className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
          <span className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
            /posts/{slug}
          </span>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex items-start gap-2">
            <Hash className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <span
                  key={c.categoryId}
                  className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-px rounded"
                >
                  {c.category.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SEO Description */}
        {seoDescription && (
          <div className="flex items-start gap-2">
            <FileText className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {seoDescription}
            </p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-start gap-2">
            <Tag className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-semibold bg-muted text-muted-foreground border border-border/60 px-1.5 py-px rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

      </HoverCardContent>
    </HoverCard>
  )
}
