import { createHash } from "crypto"
import { uploadToR2, deleteFromR2 } from "./s3"
import { filetypemime, filetypeextension } from "magic-bytes.js"

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

const RESUME_ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"]
const GENERAL_ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".txt", ".rtf",
  ".png", ".jpg", ".jpeg", ".gif",
  ".csv", ".xls", ".xlsx"
]

const RESUME_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export type UTUploadOptions = {
  isResume?: boolean
  maxSizeBytes?: number
}

function checkMaliciousBuffer(buffer: Buffer, filename: string): void {
  // 1. Check for executable magic bytes
  // Windows Executable (PE): "MZ" (0x4D, 0x5A)
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    throw new Error(`Malicious executable file signature detected in ${filename}`)
  }
  // ELF Executable: "\x7FELF" (0x7F, 0x45, 0x4C, 0x46)
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    throw new Error(`Malicious executable binary signature detected in ${filename}`)
  }

  // 2. Check for script tags in text-like files to prevent scripting injections / shells
  const lowerName = filename.toLowerCase()
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".csv") || lowerName.endsWith(".rtf")) {
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 8192))
    if (content.includes("<?php") || content.includes("<script") || content.includes("bash -i") || content.includes("exec(")) {
      throw new Error("Malicious script content detected in document.")
    }
  }
}

/**
 * Upload a document (resume or other application file) via Cloudflare R2.
 * Validates type, size, and scans for malware signatures before uploading.
 */
export async function uploadViaR2(
  file: File,
  options: UTUploadOptions = {}
): Promise<UploadResult> {
  const {
    isResume = true,
    maxSizeBytes = RESUME_MAX_BYTES,
  } = options

  if (file.size > maxSizeBytes) {
    throw new Error(`File exceeds the ${maxSizeBytes / 1024 / 1024} MB limit`)
  }

  const lowerName = file.name.toLowerCase()
  const allowedExtensions = isResume ? RESUME_ALLOWED_EXTENSIONS : GENERAL_ALLOWED_EXTENSIONS
  
  const hasValidExtension = allowedExtensions.some(ext => lowerName.endsWith(ext))
  if (!hasValidExtension) {
    throw new Error(
      isResume
        ? "Only PDF, DOC, and DOCX files are allowed for resumes."
        : `Invalid file type. Allowed formats: ${allowedExtensions.join(", ")}`
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Scan buffer for malicious executables / scripts
  checkMaliciousBuffer(buffer, file.name)

  // Verify magic bytes using magic-bytes.js
  const detectedMimes = filetypemime(buffer)
  const detectedExts = filetypeextension(buffer)
  const hasDetectedTypes = detectedMimes.length > 0 || detectedExts.length > 0

  if (hasDetectedTypes) {
    if (isResume) {
      const isValidResume = detectedExts.some(ext => ["pdf", "doc", "docx"].includes(ext)) ||
                            detectedMimes.some(mime => ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mime))
      if (!isValidResume) {
        throw new Error("Uploaded file is not a valid PDF or Word document (failed signature check).")
      }
    } else {
      const isValidGeneral = detectedExts.some(ext => ["pdf", "doc", "docx", "txt", "rtf", "png", "jpg", "jpeg", "gif", "csv", "xls", "xlsx"].includes(ext)) ||
                             detectedMimes.some(mime => [
                               "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                               "text/plain", "application/rtf", "image/png", "image/jpeg", "image/gif", "text/csv", 
                               "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                             ].includes(mime))
      if (!isValidGeneral) {
        throw new Error("Uploaded file type is not allowed (failed signature check).")
      }
    }
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const key = `resumes/${Date.now()}_${cleanName}`
  const url = await uploadToR2(key, buffer, file.type || "application/octet-stream")

  return {
    url,
    key,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  }
}

// ─── Client-side re-exports ───────────────────────────────────────────────────
// Components import from @/lib/upload — never directly from the sub-modules.

// ─── Shared utility ──────────────────────────────────────────────────────────

export { getImageDimensions } from "./image-metadata"
