"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/session"
import { Role } from "@/generated/prisma/enums"

export async function setActiveClient(clientId: string | null) {
  const session = await getSession()
  if (!session || session.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: SUPER_ADMIN only")
  }

  const jar = await cookies()
  if (clientId) {
    jar.set("cms_active_client", clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/dashboard",
    })
  } else {
    jar.set("cms_active_client", "", {
      path: "/dashboard",
      maxAge: 0,
    })
  }
}
