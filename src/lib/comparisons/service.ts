import { randomUUID } from "crypto"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { comparisonInputSchema, type ComparisonInput } from "./schema"

/**
 * Comparison mutations. They know nothing about sessions: callers (server actions, seed, tests)
 * resolve the client scope first. `clientId: null` means "unrestricted" (super admin without an
 * active client) and is only accepted for id-based operations, never for create.
 */

type Tx = Prisma.TransactionClient

export class ComparisonError extends Error {}

const scopeWhere = (clientId: string | null) => (clientId ? { clientId } : {})

async function requireOwned(tx: Tx, id: string, clientId: string | null) {
  const row = await tx.comparison.findFirst({
    where: { id, ...scopeWhere(clientId) },
    select: { id: true, clientId: true, published: true },
  })
  if (!row) throw new ComparisonError("Comparison not found.")
  return row
}

function parse(input: ComparisonInput) {
  const result = comparisonInputSchema.safeParse(input)
  if (!result.success) throw new ComparisonError(result.error.issues[0]?.message ?? "Invalid comparison.")
  return result.data
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002"
}

/** Writes options, criteria and cells in three batched inserts (ids generated up front). Cells are padded with "" so every criterion has exactly one cell per option. */
async function writeGrid(tx: Tx, comparisonId: string, data: ReturnType<typeof parse>) {
  const options = data.options.map((o, position) => ({ id: randomUUID(), comparisonId, label: o.label, linkSlug: o.linkSlug, position }))
  const criteria = data.criteria.map((c, position) => ({ id: randomUUID(), comparisonId, label: c.label, position }))
  if (options.length > 0) await tx.comparisonOption.createMany({ data: options })
  if (criteria.length > 0) await tx.comparisonCriterion.createMany({ data: criteria })
  const cells = criteria.flatMap((criterion, r) =>
    options.map((option, c) => ({
      criterionId: criterion.id,
      optionId: option.id,
      value: data.criteria[r].values[c] ?? "",
    }))
  )
  if (cells.length > 0) await tx.comparisonCell.createMany({ data: cells })
}

function headerFields(data: ReturnType<typeof parse>) {
  return {
    title: data.title,
    slug: data.slug,
    description: data.description,
    disclaimer: data.disclaimer,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    relatedServiceSlugs: data.relatedServiceSlugs,
    published: data.published,
  }
}

function rethrow(err: unknown): never {
  if (isUniqueViolation(err)) throw new ComparisonError("A comparison with this URL slug already exists.")
  throw err
}

export async function createComparison(clientId: string, input: ComparisonInput) {
  const data = parse(input)
  try {
    return await prisma.$transaction(async (tx) => {
      const last = await tx.comparison.aggregate({ where: { clientId }, _max: { position: true } })
      const comparison = await tx.comparison.create({
        data: { ...headerFields(data), clientId, position: (last._max.position ?? -1) + 1 },
      })
      await writeGrid(tx, comparison.id, data)
      return comparison
    })
  } catch (err) {
    rethrow(err)
  }
}

/** ponytail: options/criteria are replaced wholesale on save (their ids change); keep ids if consumers ever cache them. */
export async function updateComparison(clientId: string | null, id: string, input: ComparisonInput) {
  const data = parse(input)
  try {
    return await prisma.$transaction(async (tx) => {
      await requireOwned(tx, id, clientId)
      await tx.comparisonOption.deleteMany({ where: { comparisonId: id } }) // cascades cells
      await tx.comparisonCriterion.deleteMany({ where: { comparisonId: id } })
      const comparison = await tx.comparison.update({ where: { id }, data: headerFields(data) })
      await writeGrid(tx, id, data)
      return comparison
    })
  } catch (err) {
    rethrow(err)
  }
}

export async function deleteComparison(clientId: string | null, id: string) {
  await prisma.$transaction(async (tx) => {
    await requireOwned(tx, id, clientId)
    await tx.comparison.delete({ where: { id } })
  })
}

export async function setComparisonPublished(clientId: string | null, id: string, published: boolean) {
  return prisma.$transaction(async (tx) => {
    await requireOwned(tx, id, clientId)
    if (published) {
      const [options, criteria] = await Promise.all([
        tx.comparisonOption.count({ where: { comparisonId: id } }),
        tx.comparisonCriterion.count({ where: { comparisonId: id } }),
      ])
      if (options < 2 || criteria < 1) {
        throw new ComparisonError("A published comparison needs at least 2 columns and 1 row.")
      }
    }
    return tx.comparison.update({ where: { id }, data: { published } })
  })
}

/** Swaps a comparison with its neighbour in the client's list (position, then title) and renumbers the list. */
export async function moveComparison(clientId: string, id: string, direction: "up" | "down") {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.comparison.findMany({
      where: { clientId },
      orderBy: [{ position: "asc" }, { title: "asc" }],
      select: { id: true },
    })
    const from = rows.findIndex((r) => r.id === id)
    if (from === -1) throw new ComparisonError("Comparison not found.")
    const to = direction === "up" ? from - 1 : from + 1
    if (to < 0 || to >= rows.length) return
    ;[rows[from], rows[to]] = [rows[to], rows[from]]
    await Promise.all(rows.map((r, position) => tx.comparison.update({ where: { id: r.id }, data: { position } })))
  })
}
