import { createHash } from "crypto"
import { uploadToR2, deleteFromR2 } from "./s3"

// ─── Shared ───────────────────────────────────────────────────────────────────

export type UploadResult = {
  url: string
  key: string
  size: number
  mimeType: string
}

// ─── Cloudflare R2 ────────────────────────────────────────────────────────────
// Used for: media library uploads, editor images (server-side server actions)

export type R2UploadResult = UploadResult & {
  shaKey: string
  buffer: Buffer
}

/**
 * Upload a File to Cloudflare R2.
 * Returns `shaKey` and `buffer` so the caller can perform deduplication
 * checks against the DB before committing a Media record.
 */
export async function uploadToStorage(
  file: File,
  folder = "uploads"
): Promise<R2UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const shaKey = createHash("sha256").update(buffer).digest("hex")
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const key = `${folder}/${Date.now()}_${cleanName}`
  const url = await uploadToR2(key, buffer, file.type)
  return { url, key, size: file.size, mimeType: file.type, shaKey, buffer }
}

/**
 * Delete a file from Cloudflare R2 by its storage key.
 */
export async function deleteFromStorage(key: string): Promise<void> {
  return deleteFromR2(key)
}

// ─── UploadThing (server-side UTApi) ──────────────────────────────────────────
// Used for: job application resumes submitted via the public careers API

const RESUME_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const RESUME_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export type UTUploadOptions = {
  allowedTypes?: string[]
  maxSizeBytes?: number
}

/**
 * Upload a document (resume, etc.) via UploadThing's server-side UTApi.
 * Validates MIME type and size before uploading.
 */
export async function uploadViaUploadThing(
  file: File,
  options: UTUploadOptions = {}
): Promise<UploadResult> {
  const {
    allowedTypes = RESUME_ALLOWED_TYPES,
    maxSizeBytes = RESUME_MAX_BYTES,
  } = options

  if (file.size > maxSizeBytes) {
    throw new Error(`File exceeds the ${Math.round(maxSizeBytes / 1024 / 1024)} MB limit`)
  }
  if (allowedTypes.length && !allowedTypes.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Accepted: PDF, DOC, DOCX`)
  }

  const { UTApi } = await import("uploadthing/server")
  const utapi = new UTApi()
  const response = await utapi.uploadFiles(file)

  if (response.error) throw new Error(`Upload failed: ${response.error.message}`)
  if (!response.data) throw new Error("Upload failed: no response from UploadThing")

  return {
    url: response.data.ufsUrl,
    key: response.data.key,
    size: file.size,
    mimeType: file.type,
  }
}

// ─── Client-side re-exports ───────────────────────────────────────────────────
// Components import from @/lib/upload — never directly from the sub-modules.

export { useUploadThing } from "./uploadthing-react"
export type { OurFileRouter } from "./uploadthing"

// ─── Shared utility ──────────────────────────────────────────────────────────

export { getImageDimensions } from "./image-metadata"
