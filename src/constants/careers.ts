/**
 * Careers domain constants.
 * Re-exports Prisma enums from the enums-only file — pure const, no Node.js runtime.
 * Safe to import in both Client Components and Server Components.
 */
import { JobStatus } from "@/generated/prisma/enums"

export { JobStatus }
