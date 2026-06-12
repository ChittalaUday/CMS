"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createSession, deleteSession, getSession } from "@/lib/session"
import { actionClient } from "@/lib/safe-action"
import { z } from "zod"

export const loginAction = actionClient
  .schema(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  )
  .action(async ({ parsedInput: { email, password } }) => {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid credentials")
    }

    await createSession(user.id)
    return { id: user.id, email: user.email, name: user.name, role: user.role }
  })

export const logoutAction = actionClient.action(async () => {
  await deleteSession()
})

export { getSession }

