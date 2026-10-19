/**
 * Imports articles from Markdown files (front matter + body, see src/lib/utils/markdown-lite.ts) for one client.
 * Idempotent: a post is matched by (slug, client), so a second run updates instead of duplicating, and rows of
 * other clients are never touched.
 *
 * Usage: npm run content:import -- --dir prisma/data/zenith-blogs --client zenith-filings [--author <username>] [--covers <dir>] [--dry-run]
 * Without --author the posts have no author (the public API sends `author: null`). A named author must belong to the client.
 * With --covers, `<dir>/<slug>.webp` is uploaded to R2 (once per file: the client's library row is found again by its hash) and becomes the featured image.
 * A re-run keeps metadata an editor added in the CMS (see `articleMetadata`).
 *
 * Front matter keys: title, category, tags (comma separated), description (meta description, up to 160 characters),
 * seoTitle (up to 60), coverAlt (alt text of the cover, up to 125), featured, published.
 */
import "dotenv/config"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, basename } from "node:path"
import { prisma } from "../src/lib/db/prisma"
import type { Prisma } from "../src/generated/prisma/client"
import { sanitizeBlogHtml } from "../src/lib/utils/sanitize"
import { markdownToHtml, markdownToPlate } from "../src/lib/utils/markdown-lite"
import { articleMetadata, parseArticle, type Article } from "../src/lib/utils/blog-article"
import { uploadToR2 } from "../src/lib/upload/s3"
import { getImageDimensions } from "../src/lib/upload/image-metadata"
import { freeShaKey } from "../src/lib/upload/sha-key"

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

/**
 * The Media-library row of a cover file, uploaded first when the client has none with its content. It is stored
 * the way a library upload is (under `uploads/`, so deleting it in the library removes the file too), and shows
 * there as `<slug>.webp`.
 */
async function coverMediaId(file: string, slug: string, clientId: string) {
  const buffer = readFileSync(file)
  const shaKey = createHash("sha256").update(buffer).digest("hex")
  const existing = await prisma.media.findFirst({ where: { shaKey, clientId }, select: { id: true } })
  if (existing) return existing.id
  const url = await uploadToR2(`uploads/${shaKey.slice(0, 8)}_${slug}.webp`, buffer, "image/webp")
  const size = getImageDimensions(buffer, "image/webp")
  const media = await prisma.media.create({
    data: {
      filename: `${slug}.webp`,
      url,
      mimeType: "image/webp",
      size: buffer.length,
      width: size?.width ?? null,
      height: size?.height ?? null,
      shaKey: await freeShaKey(shaKey),
      clientId,
    },
  })
  return media.id
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

type Scope = Awaited<ReturnType<typeof findScope>>

/** Creates the post, or updates it in place; metadata the file does not own and an unchanged cover are kept. */
async function saveArticle(a: Article, { client, author }: Scope, coverFile: string | null) {
  const existing = await prisma.post.findFirst({
    where: { slug: a.slug, clientId: client.id },
    select: { id: true, metadata: true },
  })
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
    metadata: articleMetadata(existing?.metadata, a) as Prisma.InputJsonValue,
    ...(coverFile && { featuredImageId: await coverMediaId(coverFile, a.slug, client.id) }),
  }
  const categories = { create: [{ categoryId: category.id }] }
  if (existing) {
    await prisma.post.update({ where: { id: existing.id }, data: { ...data, categories: { deleteMany: {}, ...categories } } })
  } else {
    await prisma.post.create({ data: { ...data, slug: a.slug, authorId: author?.id ?? null, clientId: client.id, categories } })
  }
}

async function main() {
  const dir = arg("dir")
  const clientSlug = arg("client")
  const username = arg("author")
  const coversDir = arg("covers")
  const dryRun = process.argv.includes("--dry-run")
  if (!dir || !clientSlug) throw new Error("Usage: --dir <folder> --client <slug> [--author <username>] [--covers <dir>] [--dry-run]")

  const articles = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseArticle(f, readFileSync(join(dir, f), "utf8")))
  const scope = await findScope(clientSlug, username)

  for (const a of articles) {
    const cover = coversDir ? join(coversDir, `${a.slug}.webp`) : null
    const coverFile = cover && existsSync(cover) ? cover : null
    const exists = await prisma.post.findFirst({ where: { slug: a.slug, clientId: scope.client.id }, select: { id: true } })
    console.log(
      `${dryRun ? "would " : ""}${exists ? "update" : "create"}  ${a.slug}  [${a.category}]${a.featured ? "  featured" : ""}${coverFile ? "  cover" : ""}`
    )
    if (!dryRun) await saveArticle(a, scope, coverFile)
  }
  console.log(`${articles.length} articles for ${clientSlug}${dryRun ? " (dry run, nothing written)" : ""}`)
}

main()
  .catch((e) => {
    console.error("Import failed:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
