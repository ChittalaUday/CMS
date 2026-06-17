"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createSession, deleteSession, getSession } from "@/lib/session"
import { actionClient } from "@/lib/safe-action"
import { z } from "zod"

// Pre-computed at module load time so it's ready on the first request.
// Used to ensure bcrypt.compare always runs regardless of whether the email
// exists, preventing timing-based user enumeration.
const DUMMY_HASH_PROMISE = bcrypt.hash("__timing_guard_never_matches__", 12)

export const loginAction = actionClient
  .schema(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  )
  .action(async ({ parsedInput: { email, password } }) => {
    const user = await prisma.user.findUnique({ where: { email } })

    const dummyHash = await DUMMY_HASH_PROMISE
    const isMatch = await bcrypt.compare(password, user?.password ?? dummyHash)
    if (!user || !isMatch) {
      throw new Error("Invalid credentials")
    }

    await createSession(user.id)
    return { id: user.id, email: user.email, name: user.name, role: user.role }
  })

export const logoutAction = actionClient.action(async () => {
  await deleteSession()
})

export { getSession }

