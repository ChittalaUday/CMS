"use server"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { getSession } from "@/lib/session"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { actionClient } from "@/lib/safe-action"
import { z } from "zod"

const SALT_ROUNDS = 12

async function ensureAdmin() {
  const sessionUser = await getSession()
  if (!sessionUser || (sessionUser.role !== "SUPER_ADMIN" && sessionUser.role !== "ADMIN")) {
    throw new Error("Unauthorized: Access denied")
  }
  return sessionUser
}

export async function getEditors() {
  const sessionUser = await ensureAdmin()
  
  if (sessionUser.role === "SUPER_ADMIN") {
    // Super Admin can view both ADMIN and EDITOR roles
    return await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "EDITOR"],
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // Regular Admin can only view EDITOR role
  return await prisma.user.findMany({
    where: { role: "EDITOR" },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export const createEditor = actionClient
  .schema(
    z.object({
      email: z.string().email("Invalid email format"),
      username: z.string().min(3, "Username must be at least 3 characters"),
      name: z.string().min(1, "Name is required"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      role: z.enum(["ADMIN", "EDITOR"]).optional(),
    })
  )
  .action(async ({ parsedInput: data }) => {
    const sessionUser = await ensureAdmin()

    // Determine role based on creator's permission
    let targetRole: "ADMIN" | "EDITOR" = "EDITOR"
    if (sessionUser.role === "SUPER_ADMIN" && data.role) {
      if (data.role === "ADMIN" || data.role === "EDITOR") {
        targetRole = data.role
      }
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existingEmail) {
      throw new Error("Email already registered")
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    })
    if (existingUsername) {
      throw new Error("Username already taken")
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.name,
        password: hashedPassword,
        role: targetRole,
      },
    })

    revalidatePath("/dashboard/users")
    return { id: user.id, email: user.email }
  })

export const updateEditor = actionClient
  .schema(
    z.object({
      id: z.string(),
      email: z.string().email("Invalid email format"),
      username: z.string().min(3, "Username must be at least 3 characters"),
      name: z.string().min(1, "Name is required"),
      password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
      role: z.enum(["ADMIN", "EDITOR"]).optional(),
    })
  )
  .action(async ({ parsedInput: { id, ...data } }) => {
    const sessionUser = await ensureAdmin()

    const existing = await prisma.user.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new Error("User not found")
    }

    // Permission checks:
    // Admin can only manage EDITOR.
    if (sessionUser.role === "ADMIN" && existing.role !== "EDITOR") {
      throw new Error("Only editor accounts can be managed here")
    }

    // Super Admin can manage ADMIN and EDITOR (but not other Super Admins here)
    if (sessionUser.role === "SUPER_ADMIN" && existing.role !== "ADMIN" && existing.role !== "EDITOR") {
      throw new Error("Unauthorized to manage this user")
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    })
    if (existingEmail) {
      throw new Error("Email already registered")
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id } },
    })
    if (existingUsername) {
      throw new Error("Username already taken")
    }

    const updateData: Prisma.UserUpdateInput = {
      email: data.email,
      username: data.username,
      name: data.name,
    }

    if (sessionUser.role === "SUPER_ADMIN" && data.role) {
      if (data.role === "ADMIN" || data.role === "EDITOR") {
        updateData.role = data.role
      }
    }

    if (data.password && data.password.trim() !== "") {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/dashboard/users")
    return { id: user.id, email: user.email }
  })

export const deleteEditor = actionClient
  .schema(
    z.object({
      id: z.string(),
    })
  )
  .action(async ({ parsedInput: { id } }) => {
    const sessionUser = await ensureAdmin()

    const existing = await prisma.user.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new Error("User not found")
    }

    // Permission checks:
    if (sessionUser.role === "ADMIN" && existing.role !== "EDITOR") {
      throw new Error("Only editor accounts can be deleted here")
    }

    if (sessionUser.role === "SUPER_ADMIN" && existing.role !== "ADMIN" && existing.role !== "EDITOR") {
      throw new Error("Unauthorized to delete this user")
    }

    await prisma.user.delete({
      where: { id },
    })

    revalidatePath("/dashboard/users")
    return { success: true }
  })

