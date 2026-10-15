import { z } from "zod"

/** Client-safe (no server imports): shared by the editor form, the server actions and the service. */

export const COMPARISON_LIMITS = {
  maxOptions: 8,
  maxCriteria: 60,
  maxServiceSlugs: 50,
} as const

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))

const slugField = z.string().trim().min(1).max(200).regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only")

export const comparisonInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: slugField,
    description: optionalText(2000),
    disclaimer: optionalText(2000),
    seoTitle: optionalText(200),
    seoDescription: optionalText(500),
    relatedServiceSlugs: z.array(slugField).max(COMPARISON_LIMITS.maxServiceSlugs).default([]),
    published: z.boolean().default(false),
    /** Columns of the table. */
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Every column needs a label").max(100),
          linkSlug: optionalText(200),
        })
      )
      .max(COMPARISON_LIMITS.maxOptions),
    /** Rows of the table; `values[i]` is the cell under `options[i]`. */
    criteria: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Every row needs a label").max(200),
          values: z.array(z.string().max(2000)),
        })
      )
      .max(COMPARISON_LIMITS.maxCriteria),
  })
  .refine((v) => v.criteria.every((c) => c.values.length <= v.options.length), {
    message: "A row has more cells than there are columns",
    path: ["criteria"],
  })
  .refine((v) => !v.published || (v.options.length >= 2 && v.criteria.length >= 1), {
    message: "A published comparison needs at least 2 columns and 1 row",
    path: ["published"],
  })

export type ComparisonInput = z.input<typeof comparisonInputSchema>
export type ComparisonData = z.output<typeof comparisonInputSchema>

/** Editable shape handed to the editor form. */
export type ComparisonFormValues = {
  title: string
  slug: string
  description: string
  disclaimer: string
  seoTitle: string
  seoDescription: string
  relatedServiceSlugs: string[]
  published: boolean
  options: { label: string; linkSlug: string }[]
  criteria: { label: string; values: string[] }[]
}
