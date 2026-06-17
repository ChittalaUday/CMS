"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { revalidatePath } from "next/cache"

export async function completeOnboarding(data: {
  name?: string
  bio?: string
  avatarUrl?: string
}) {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized: please log in.")

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(data.name?.trim() ? { name: data.name.trim() } : {}),
      ...(data.bio !== undefined ? { bio: data.bio.trim() || null } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl.trim() || null } : {}),
      onboardingCompleted: true,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/onboarding")
}
