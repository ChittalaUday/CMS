import { FileText } from "lucide-react"
import { WidgetCard } from "../WidgetCard"
import type { TopPost } from "../../_data/blog-queries"

interface Props {
  posts: TopPost[]
}

export function TopPostsWidget({ posts }: Props) {
  return (
    <WidgetCard title="Top Posts" description="By views" icon={FileText}>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No published posts yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium pr-4">Title</th>
                <th className="pb-2 font-medium text-right pr-4">Views</th>
                <th className="pb-2 font-medium text-right hidden md:table-cell">
                  Published
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 pr-4">
                    <span className="line-clamp-1 font-medium text-foreground">
                      {post.title}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {post.views.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    {post.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  )
}
