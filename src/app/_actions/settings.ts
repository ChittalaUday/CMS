"use server"

import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { actionClient } from "@/lib/utils/safe-action"
import { z } from "zod"
import bcrypt from "bcryptjs"

const SALT_ROUNDS = 12

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens (no spaces)"
  )

export const updateProfile = actionClient
  .inputSchema(
    z.object({
      username: usernameSchema,
      name: z.string().max(80, "Name must be at most 80 characters").optional(),
      bio: z.string().max(200, "Bio must be at most 200 characters").optional(),
      avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    })
  )
  .action(async ({ parsedInput: data }) => {
    const user = await getSession()
    if (!user) throw new Error("Unauthorized")

    const taken = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id: user.id } },
    })
    if (taken) throw new Error("Username already taken")

    await prisma.user.update({
      where: { id: user.id },
      data: {
        username: data.username,
        name: data.name?.trim() || null,
        bio: data.bio?.trim() || null,
        avatarUrl: data.avatarUrl?.trim() || null,
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/settings")
    return { success: true }
  })

export const updatePassword = actionClient
  .inputSchema(
    z
      .object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      })
      .refine((d) => d.newPassword === d.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      })
  )
  .action(async ({ parsedInput: { newPassword } }) => {
    const user = await getSession()
    if (!user) throw new Error("Unauthorized")

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    })

    return { success: true }
  })
