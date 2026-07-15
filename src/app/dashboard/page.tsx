import { getSession } from "@/lib/auth/session"
import {
  canAccessBlogs,
  canAccessCareers,
  isDeveloper,
  isSuperAdmin,
} from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import {
  FileText,
  Eye,
  Briefcase,
  Users,
} from "lucide-react"

import { WidgetGrid, WidgetSlot } from "./_widgets/WidgetGrid"
import { StatCard } from "./_widgets/StatCard"
import { ActiveCareersWidget } from "./_widgets/careers/ActiveCareersWidget"
import { TopPostsWidget } from "./_widgets/blogs/TopPostsWidget"
import { TimeRangeSelector } from "./_widgets/TimeRangeSelector"
import { fetchBlogStats } from "./_data/blog-queries"
import { fetchCareersStats } from "./_data/careers-queries"

export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const user = await getSession()
  if (!user) redirect("/")
  if (isDeveloper(user.role)) redirect("/dashboard/settings/api-docs")

  const { days: daysParam } = await searchParams
  const days = Math.min(Math.max(Number(daysParam ?? 30), 7), 90)

  // Resolve active clientId
  let clientId: string | null = null
  if (isSuperAdmin(user.role)) {
    const jar = await cookies()
    clientId = jar.get("cms_active_client")?.value ?? null
  } else {
    clientId = user.clientId ?? null
  }

  const [blog, careers] = await Promise.all([
    canAccessBlogs(user.role)
      ? fetchBlogStats({
        clientId,
        userId: user.role === "EDITOR" ? user.id : undefined,
        days,
      })
      : null,
    canAccessCareers(user.role)
      ? fetchCareersStats({ clientId, days })
      : null,
  ])

  const hasBlog = blog !== null
  const hasCareers = careers !== null
  const hasAll = hasBlog && hasCareers

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {user.name ?? user.username}
          </p>
        </div>
        <TimeRangeSelector />
      </div>

      <WidgetGrid>
        {/* ── SUPER_ADMIN / ADMIN ── */}
        {hasAll && (
          <>
            {/* Stat row */}
            <WidgetSlot size="sm">
              <StatCard
                title="Published Posts"
                value={blog.totalPosts}
                icon={FileText}
              />
            </WidgetSlot>
            <WidgetSlot size="sm">
              <StatCard
                title="Total Views"
                value={blog.totalViews}
                icon={Eye}
              />
            </WidgetSlot>
            <WidgetSlot size="sm">
              <StatCard
                title="Open Jobs"
                value={careers.openJobs}
                icon={Briefcase}
              />
            </WidgetSlot>
            <WidgetSlot size="sm">
              <StatCard
                title={`New Applications (${days}d)`}
                value={careers.newApplications}
                icon={Users}
              />
            </WidgetSlot>


            {/* Blog widget */}
            <WidgetSlot size="md">
              <TopPostsWidget posts={blog.topPosts} />
            </WidgetSlot>
            {/* Careers charts */}
            <WidgetSlot size="md">
              <ActiveCareersWidget jobs={careers.activeJobs} />
            </WidgetSlot>

          </>
        )}


        {/* ── EDITOR only ── */}
        {hasBlog && !hasCareers && (
          <>
            <WidgetSlot size="md">
              <StatCard
                title="Published Posts"
                value={blog.totalPosts}
                icon={FileText}
              />
            </WidgetSlot>
            <WidgetSlot size="md">
              <StatCard
                title="Total Views"
                value={blog.totalViews}
                icon={Eye}
              />
            </WidgetSlot>
            <WidgetSlot size="full">
              <TopPostsWidget posts={blog.topPosts} />
            </WidgetSlot>
          </>
        )}

        {/* ── HR only ── */}
        {!hasBlog && hasCareers && (
          <>
            <WidgetSlot size="md">
              <StatCard
                title="Open Jobs"
                value={careers.openJobs}
                icon={Briefcase}
              />
            </WidgetSlot>
            <WidgetSlot size="md">
              <StatCard
                title={`New Applications (${days}d)`}
                value={careers.newApplications}
                icon={Users}
              />
            </WidgetSlot>
            <WidgetSlot size="md">
              <ActiveCareersWidget jobs={careers.activeJobs} />
            </WidgetSlot>

          </>
        )}

      </WidgetGrid>
    </div>
  )
}
