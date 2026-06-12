"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { createSession, deleteSession, getSession } from "@/lib/session"

export async function loginAction(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid credentials")
  }

  await createSession(user.id)
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export async function logoutAction() {
  await deleteSession()
  redirect("/login")
}

export { getSession }
