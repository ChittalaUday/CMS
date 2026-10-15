/**
 * Extract up to 2 uppercase initials from a name, username, or email.
 * Examples:
 *   "Admin User" -> "AU"
 *   "admin.user" -> "AU"
 *   "Uday"       -> "UD"
 *   "U"          -> "U"
 */
export function getInitials(name?: string | null): string {
  if (!name) return "U"
  const trimmed = name.trim()
  if (!trimmed) return "U"

  // Split on spaces, dots, dashes, underscores
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return "U"

  if (parts.length === 1) {
    const single = parts[0]
    return single.length >= 2
      ? single.slice(0, 2).toUpperCase()
      : single.toUpperCase()
  }

  const first = parts[0][0]
  const last = parts[parts.length - 1][0]
  return (first + last).toUpperCase()
}

const AVATAR_PALETTE = [
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#0284c7", // sky-600
  "#4f46e5", // indigo-600
  "#c026d3", // fuchsia-600
  "#0d9488", // teal-600
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Generates an inline SVG data URI avatar containing initials on a colored background.
 * Completely local, zero network requests, fast, and CSP-compliant.
 */
export function generateInitialsAvatar(
  name?: string | null,
  options?: {
    background?: string
    color?: string
    size?: number
    rounded?: number
  }
): string {
  const safeName = name?.trim() || "User"
  const initials = getInitials(safeName)
  const size = options?.size ?? 64
  const rounded = options?.rounded ?? 12
  const color = options?.color ?? "#ffffff"

  const bg =
    options?.background ||
    AVATAR_PALETTE[hashString(safeName) % AVATAR_PALETTE.length]

  const fontSize = Math.round(size * 0.42)

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="100%" height="100%" rx="${rounded}" fill="${bg}"/>`,
    `<text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${color}" text-anchor="middle" dominant-baseline="middle">${initials}</text>`,
    `</svg>`,
  ].join("")

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
