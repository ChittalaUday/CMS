import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await prisma.post.findUnique({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentJson: true,
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

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or is not published" },
        { status: 404 }
      )
    }

    const formattedPost = {
      ...post,
      categories: post.categories.map((c) => c.category),
    }

    return NextResponse.json({ post: formattedPost })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    )
  }
}
