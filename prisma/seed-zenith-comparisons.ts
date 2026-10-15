/**
 * Imports the Zenith Filings comparison tables (prisma/data/zenith-comparisons.json) for the
 * `zenith-filings` client, creating the client if it does not exist. Idempotent by slug.
 * Does not create API keys. Usage: npm run prisma:seed:zenith-comparisons
 */
import "dotenv/config"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { prisma } from "../src/lib/db/prisma"
import { createComparison, updateComparison } from "../src/lib/comparisons/service"

type SourceComparison = {
  slug: string
  title: string
  description?: string | null
  disclaimer?: string | null
  options: { label: string; serviceSlug?: string | null }[]
  criteria: { label: string; values: string[] }[]
  relatedServiceSlugs?: string[]
}

async function main() {
  const data: SourceComparison[] = JSON.parse(
    readFileSync(join(__dirname, "data", "zenith-comparisons.json"), "utf8")
  )

  const client = await prisma.client.upsert({
    where: { slug: "zenith-filings" },
    update: {},
    create: { name: "Zenith Filings", slug: "zenith-filings", domain: "https://zenithfilings.com", status: "ACTIVE" },
  })
  console.log(`Client zenith-filings: ${client.id}`)

  for (const c of data) {
    const input = {
      slug: c.slug,
      title: c.title,
      description: c.description,
      disclaimer: c.disclaimer,
      relatedServiceSlugs: c.relatedServiceSlugs ?? [],
      published: true,
      options: c.options.map((o) => ({ label: o.label, linkSlug: o.serviceSlug })),
      criteria: c.criteria,
    }
    const existing = await prisma.comparison.findFirst({
      where: { slug: c.slug, clientId: client.id },
      select: { id: true },
    })
    if (existing) {
      await updateComparison(client.id, existing.id, input)
      console.log(`  updated  ${c.slug}`)
    } else {
      await createComparison(client.id, input)
      console.log(`  created  ${c.slug}`)
    }
  }
}

main()
  .catch((e) => {
    console.error("Seeding failed:")
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
