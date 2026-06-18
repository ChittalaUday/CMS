import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  try {
    await prisma.user.count()
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: "error", message: "Database unavailable" },
      { status: 503 }
    )
  }
}
