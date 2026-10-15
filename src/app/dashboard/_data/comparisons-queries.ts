import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { ComparisonFormValues } from "@/lib/comparisons/schema"

const orderBy: Prisma.ComparisonOrderByWithRelationInput[] = [{ position: "asc" }, { title: "asc" }]

const gridInclude = {
  options: { orderBy: { position: "asc" as const } },
  criteria: { orderBy: { position: "asc" as const }, include: { cells: true } },
} satisfies Prisma.ComparisonInclude

type ComparisonWithGrid = Prisma.ComparisonGetPayload<{ include: typeof gridInclude }>

/** One cell value per option, in option order; "" when a cell is missing. */
function valuesFor(criterion: ComparisonWithGrid["criteria"][number], options: ComparisonWithGrid["options"]) {
  const byOption = new Map(criterion.cells.map((c) => [c.optionId, c.value]))
  return options.map((o) => byOption.get(o.id) ?? "")
}

// ── Public API ──────────────────────────────────────────────────────────────

export function shapePublicComparison(row: ComparisonWithGrid) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    disclaimer: row.disclaimer,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    relatedServiceSlugs: row.relatedServiceSlugs,
    updatedAt: row.updatedAt,
    options: row.options.map((o) => ({ id: o.id, label: o.label, linkSlug: o.linkSlug })),
    criteria: row.criteria.map((c) => ({ id: c.id, label: c.label, values: valuesFor(c, row.options) })),
  }
}

export async function getPublicComparisons(clientId: string, page: number, limit: number) {
  const where: Prisma.ComparisonWhereInput = { clientId, published: true }
  const [total, rows] = await Promise.all([
    prisma.comparison.count({ where }),
    prisma.comparison.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        updatedAt: true,
        options: { orderBy: { position: "asc" }, select: { label: true } },
      },
    }),
  ])
  return {
    comparisons: rows.map(({ options, ...c }) => ({ ...c, optionLabels: options.map((o) => o.label) })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export async function getPublicComparison(clientId: string, slug: string) {
  const row = await prisma.comparison.findFirst({
    where: { slug, clientId, published: true },
    include: gridInclude,
  })
  return row ? shapePublicComparison(row) : null
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export async function listComparisons(opts: {
  clientId: string | null
  search?: string
  status?: string
  page: number
  pageSize: number
}) {
  const where: Prisma.ComparisonWhereInput = { ...(opts.clientId ? { clientId: opts.clientId } : {}) }
  const search = opts.search?.trim()
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ]
  }
  if (opts.status === "PUBLISHED") where.published = true
  if (opts.status === "DRAFT") where.published = false

  const [comparisons, totalCount] = await Promise.all([
    prisma.comparison.findMany({
      where,
      orderBy,
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        position: true,
        updatedAt: true,
        _count: { select: { options: true, criteria: true } },
      },
    }),
    prisma.comparison.count({ where }),
  ])
  return { comparisons, totalCount, totalPages: Math.ceil(totalCount / opts.pageSize) }
}

export async function getComparisonForEdit(id: string, clientId: string | null) {
  const row = await prisma.comparison.findFirst({
    where: { id, ...(clientId ? { clientId } : {}) },
    include: gridInclude,
  })
  if (!row) return null
  const values: ComparisonFormValues = {
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    disclaimer: row.disclaimer ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    relatedServiceSlugs: row.relatedServiceSlugs,
    published: row.published,
    options: row.options.map((o) => ({ label: o.label, linkSlug: o.linkSlug ?? "" })),
    criteria: row.criteria.map((c) => ({ label: c.label, values: valuesFor(c, row.options) })),
  }
  return { id: row.id, values }
}
