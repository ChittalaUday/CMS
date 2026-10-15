import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { parseSites, type AnalyticsSite } from "./schema"
import { createWebsite, findWebsiteByDomain } from "./umami"

/**
 * Which Umami website belongs to which client. Stored in the existing `Client.settings` JSON under
 * `analytics.sites` (no migration); other keys in `settings` (e.g. careers) are always preserved.
 */

export class AnalyticsError extends Error {}

export async function getClientSites(clientId: string): Promise<AnalyticsSite[]> {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { settings: true } })
  return parseSites(client?.settings)
}

/** Every active client's sites, for the super-admin overview. */
export async function listAllClientSites() {
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, settings: true },
    orderBy: { name: "asc" },
  })
  return clients
    .map((c) => ({ client: { id: c.id, name: c.name }, sites: parseSites(c.settings) }))
    .filter((c) => c.sites.length > 0)
}

async function writeSites(tx: Prisma.TransactionClient, clientId: string, mutate: (s: AnalyticsSite[]) => AnalyticsSite[]) {
  const client = await tx.client.findUnique({ where: { id: clientId }, select: { settings: true } })
  if (!client) throw new AnalyticsError("Client not found.")
  const settings = (client.settings as Record<string, unknown> | null) ?? {}
  const sites = mutate(parseSites(settings))
  await tx.client.update({
    where: { id: clientId },
    data: { settings: { ...settings, analytics: { sites } } as Prisma.InputJsonValue },
  })
  return sites
}

/** Links the domain's Umami website (created if it does not exist yet) to the client. */
export async function addSite(clientId: string, input: { name: string; domain: string }) {
  const existing = await getClientSites(clientId)
  if (existing.some((s) => s.domain === input.domain)) {
    throw new AnalyticsError("This domain is already tracked for this client.")
  }
  const created = (await findWebsiteByDomain(input.domain)) ?? (await createWebsite(input.name, input.domain))
  const site: AnalyticsSite = { name: input.name, domain: input.domain, websiteId: created.id }
  await prisma.$transaction((tx) => writeSites(tx, clientId, (s) => [...s, site]))
  return site
}

/** Unlinks a site from the client. The data stays in Umami, so re-adding the same id restores history. */
export async function removeSite(clientId: string, websiteId: string) {
  await prisma.$transaction((tx) => writeSites(tx, clientId, (s) => s.filter((x) => x.websiteId !== websiteId)))
}
