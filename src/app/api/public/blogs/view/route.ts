import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { recordView } from "@/app/dashboard/blogs/actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { slug, postId } = body

    let targetPostId = postId

    if (!targetPostId && slug) {
      const post = await prisma.post.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      }
      targetPostId = post.id
    }

    if (!targetPostId) {
      return NextResponse.json({ error: "slug or postId is required" }, { status: 400 })
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
    const userAgent = request.headers.get("user-agent") || undefined

    // Call the existing recordView function which adds view to the DB
    await recordView(targetPostId, ipAddress, userAgent)

    return NextResponse.json({ success: true, message: "View recorded" })
  } catch {
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 }
    )
  }
}
