export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export type InviteStatus = "pending" | "accepted" | "expired"

export function getInviteStatus(invite: {
  usedAt: Date | null
  expiresAt: Date
}): InviteStatus {
  if (invite.usedAt) return "accepted"
  if (new Date(invite.expiresAt) < new Date()) return "expired"
  return "pending"
}
