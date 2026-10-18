import { prisma } from "@/lib/db/prisma"

/**
 * Media rows belong to one client. The same file uploaded by two clients is two rows pointing at one stored
 * object, and only the first keeps the globally unique `shaKey`; the others store null.
 */
export async function freeShaKey(shaKey: string): Promise<string | null> {
  const taken = await prisma.media.findUnique({ where: { shaKey }, select: { id: true } })
  return taken ? null : shaKey
}
