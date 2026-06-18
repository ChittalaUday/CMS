import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        featured: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        featuredImage: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
            size: true,
          },
        },
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    // Format categories to be an array of simple category objects
    const formattedPosts = posts.map((post) => ({
      ...post,
      categories: post.categories.map((c) => c.category),
    }))

    return NextResponse.json({ posts: formattedPosts })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    )
  }
}
