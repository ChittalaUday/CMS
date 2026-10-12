/**
 * Slug normalization and intelligent numeric increment helpers.
 */

/**
 * Converts a text string into a clean, URL-safe slug.
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

/**
 * Parses a slug into its root base identifier and any existing trailing numeric suffix.
 * 
 * Handles cases like:
 * - "project-manager"     => { base: "project-manager", suffixNumber: null }
 * - "project-manager-2"   => { base: "project-manager", suffixNumber: 2 }
 * - "project-manager-2-2" => { base: "project-manager", suffixNumber: 2 }
 */
export function parseSlugBase(slug: string): { base: string; suffixNumber: number | null } {
  const clean = toSlug(slug)
  if (!clean) return { base: "", suffixNumber: null }

  // Check if slug has one or more trailing numeric hyphen segments (e.g., -2 or -2-2)
  const hasNumericSuffix = /(?:-\d+)+$/.test(clean)
  if (hasNumericSuffix) {
    // Extract the final numeric suffix
    const lastNumMatch = clean.match(/-(\d+)$/)
    const lastNum = lastNumMatch ? parseInt(lastNumMatch[1], 10) : null
    
    // Clean all trailing numbers to get the actual root base slug
    const rootBase = clean.replace(/(?:-\d+)+$/, "")
    return {
      base: rootBase || clean,
      suffixNumber: lastNum,
    }
  }

  return {
    base: clean,
    suffixNumber: null,
  }
}

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Intelligently generates the next available unique slug for a given base.
 * Avoids awkward duplicate suffixes like "-2-2" by incrementing the numeric suffix.
 * 
 * Examples:
 * - "project-manager"   with ["project-manager"] => "project-manager-2"
 * - "project-manager-2" with ["project-manager", "project-manager-2"] => "project-manager-3"
 * - "project-manager-2" with ["project-manager-2", "project-manager-3"] => "project-manager-4"
 */
export function generateNextAvailableSlug(
  takenSlug: string,
  existingSlugs: string[]
): string {
  const { base, suffixNumber } = parseSlugBase(takenSlug)
  if (!base) return "job-2"

  // Collect all taken numbers associated with this base slug
  const takenNumbers = new Set<number>()
  const basePattern = new RegExp(`^${escapeRegex(base)}(?:-(\\d+))?$`)

  for (const s of existingSlugs) {
    const clean = toSlug(s)
    const m = clean.match(basePattern)
    if (m) {
      if (m[1]) {
        takenNumbers.add(parseInt(m[1], 10))
      } else {
        takenNumbers.add(1)
      }
    }
  }

  // Start candidate at (suffixNumber + 1) if a number was already specified, else 2
  let candidateNumber = suffixNumber && suffixNumber >= 2 ? suffixNumber + 1 : 2

  while (takenNumbers.has(candidateNumber)) {
    candidateNumber++
  }

  return `${base}-${candidateNumber}`
}
