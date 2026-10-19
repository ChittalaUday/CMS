/**
 * Imports articles from Markdown files (front matter + body, see src/lib/utils/markdown-lite.ts) for one client.
 * Idempotent: a post is matched by (slug, client), so a second run updates instead of duplicating, and rows of
 * other clients are never touched.
 *
 * Usage: npm run content:import -- --dir prisma/data/zenith-blogs --client zenith-filings [--author <username>] [--dry-run]
 * Without --author the posts have no author (the public API sends `author: null`). A named author must belong to the client.
 *
 * Front matter keys: title, category, tags (comma separated), description (meta description), featured, published.
 */
import "dotenv/config"
import { readFileSync, readdirSync } from "node:fs"
import { join, basename } from "node:path"
import { prisma } from "../src/lib/db/prisma"
import type { Prisma } from "../src/generated/prisma/client"
import { sanitizeBlogHtml } from "../src/lib/utils/sanitize"
import { markdownToHtml, markdownToPlate } from "../src/lib/utils/markdown-lite"

type Article = {
  slug: string
  title: string
  category: string
  tags: string[]
  description: string
  featured: boolean
  published: boolean
  body: string
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function parseArticle(file: string, source: string): Article {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${file}: missing front matter`)
  const meta = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const i = line.indexOf(":")
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    })
  )
  for (const key of ["title", "category", "description"]) {
    if (!meta[key]) throw new Error(`${file}: front matter needs ${key}`)
  }
  return {
    slug: basename(file, ".md"),
    title: meta.title,
    category: meta.category,
    tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    description: meta.description,
    featured: meta.featured === "true",
    published: meta.published !== "false",
    body: match[2].trim(),
  }
}

async function findScope(clientSlug: string, username?: string) {
  const client = await prisma.client.findUnique({ where: { slug: clientSlug } })
  if (!client) throw new Error(`No client with slug "${clientSlug}"`)
  if (!username) return { client, author: null }
  const author = await prisma.user.findUnique({ where: { username } })
  if (!author) throw new Error(`No user "${username}"`)
  if (author.clientId !== client.id) throw new Error(`User "${username}" does not belong to client "${clientSlug}"`)
  return { client, author }
}

async function main() {
  const dir = arg("dir")
  const clientSlug = arg("client")
  const username = arg("author")
  const dryRun = process.argv.includes("--dry-run")
  if (!dir || !clientSlug) throw new Error("Usage: --dir <folder> --client <slug> [--author <username>] [--dry-run]")

  const articles = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseArticle(f, readFileSync(join(dir, f), "utf8")))
  const { client, author } = await findScope(clientSlug, username)

  for (const a of articles) {
    const existing = await prisma.post.findFirst({ where: { slug: a.slug, clientId: client.id }, select: { id: true } })
    console.log(`${dryRun ? "would " : ""}${existing ? "update" : "create"}  ${a.slug}  [${a.category}]`)
    if (dryRun) continue

    const category = await prisma.category.upsert({
      where: { slug_clientId: { slug: slugify(a.category), clientId: client.id } },
      update: {},
      create: { name: a.category, slug: slugify(a.category), clientId: client.id },
    })
    const data = {
      title: a.title,
      content: sanitizeBlogHtml(markdownToHtml(a.body)),
      contentJson: markdownToPlate(a.body) as Prisma.InputJsonValue,
      published: a.published,
      featured: a.featured,
      metadata: { seoDescription: a.description, tags: a.tags },
    }
    if (existing) {
      await prisma.post.update({
        where: { id: existing.id },
        data: { ...data, categories: { deleteMany: {}, create: [{ categoryId: category.id }] } },
      })
    } else {
      await prisma.post.create({
        data: { ...data, slug: a.slug, authorId: author?.id ?? null, clientId: client.id, categories: { create: [{ categoryId: category.id }] } },
      })
    }
  }
  console.log(`${articles.length} articles for ${clientSlug}${dryRun ? " (dry run, nothing written)" : ""}`)
}

main()
  .catch((e) => {
    console.error("Import failed:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
