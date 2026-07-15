import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        // Avoid sending browser fingerprint headers upstream
        "User-Agent": "Mozilla/5.0 (compatible; CMS-Proxy/1.0)",
      },
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch remote resource: ${res.statusText}`)
    }

    const body = await res.arrayBuffer()
    const headers = new Headers()

    // Preserve content type
    const contentType = res.headers.get("Content-Type")
    headers.set("Content-Type", contentType || "application/octet-stream")

    // Force inline display (not download)
    headers.set("Content-Disposition", "inline")

    // Allow PDF.js to fetch cross-origin
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")

    // Cache for 5 minutes
    headers.set("Cache-Control", "public, max-age=300")

    return new NextResponse(body, { status: 200, headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: message || "Failed to proxy document" },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  })
}
