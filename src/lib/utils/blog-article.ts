import { basename } from "node:path"

/** The longest SEO title and meta description search results show in full. */
export const SEO_TITLE_MAX = 60
export const META_DESCRIPTION_MAX = 160
/** A picture's alt text stays short: screen readers read it in one breath. */
export const COVER_ALT_MAX = 125

export type Article = {
  slug: string
  title: string
  category: string
  tags: string[]
  description: string
  seoTitle: string
  coverAlt: string
  featured: boolean
  published: boolean
  body: string
}

const tooLong = (file: string, key: string, value: string, max: number) => {
  if (value.length > max) throw new Error(`${file}: ${key} is ${value.length} characters, the limit is ${max}`)
}

/** An article file: front matter (`key: value` lines between `---`), then the Markdown body. */
export function parseArticle(file: string, source: string): Article {
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
  tooLong(file, "description", meta.description, META_DESCRIPTION_MAX)
  tooLong(file, "seoTitle", meta.seoTitle ?? "", SEO_TITLE_MAX)
  tooLong(file, "coverAlt", meta.coverAlt ?? "", COVER_ALT_MAX)
  return {
    slug: basename(file, ".md"),
    title: meta.title,
    category: meta.category,
    tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    description: meta.description,
    seoTitle: meta.seoTitle ?? "",
    coverAlt: meta.coverAlt ?? "",
    featured: meta.featured === "true",
    published: meta.published !== "false",
    body: match[2].trim(),
  }
}

/**
 * A post's metadata after an import: the keys the file owns are set, every other key (an editor's reviewer or
 * related services, the proposed slug of a revision) is kept. A file without `seoTitle` or `coverAlt` leaves what
 * an editor wrote in the CMS alone.
 */
export function articleMetadata(existing: unknown, article: Article): Record<string, unknown> {
  const kept = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {}
  return {
    ...kept,
    seoDescription: article.description,
    tags: article.tags,
    ...(article.seoTitle && { seoTitle: article.seoTitle }),
    ...(article.coverAlt && { coverAlt: article.coverAlt }),
  }
}
