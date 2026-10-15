"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionClient } from "@/lib/utils/safe-action"
import { getSession } from "@/lib/auth/session"
import { ADMIN_ROLES, type Role } from "@/lib/auth/roles"
import { requireClientScope } from "@/lib/utils/client-context"
import { siteInputSchema } from "@/lib/analytics/schema"
import { addSite, removeSite, AnalyticsError } from "@/lib/analytics/sites"
import { UmamiError } from "@/lib/analytics/umami"

async function requireAnalyticsAdmin() {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized: please log in.")
  if (!(ADMIN_ROLES as readonly Role[]).includes(user.role)) {
    throw new Error("Unauthorized: only admins can manage tracked sites.")
  }
}

const friendly = (err: unknown): never => {
  if (err instanceof AnalyticsError || err instanceof UmamiError) throw new Error(err.message)
  throw err
}

export const addSiteAction = actionClient.inputSchema(siteInputSchema).action(async ({ parsedInput }) => {
  await requireAnalyticsAdmin()
  const clientId = await requireClientScope()
  try {
    const site = await addSite(clientId, parsedInput)
    revalidatePath("/dashboard/analytics")
    return { websiteId: site.websiteId }
  } catch (err) {
    return friendly(err)
  }
})

export const removeSiteAction = actionClient
  .inputSchema(z.object({ websiteId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await requireAnalyticsAdmin()
    const clientId = await requireClientScope()
    try {
      await removeSite(clientId, parsedInput.websiteId)
    } catch (err) {
      return friendly(err)
    }
    revalidatePath("/dashboard/analytics")
    return { ok: true }
  })
