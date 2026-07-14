"use server"

import { getSession } from "@/lib/auth/session"
import { uploadToStorage } from "@/lib/upload"

export async function uploadAvatar(formData: FormData) {
  const user = await getSession()
  if (!user) throw new Error("Unauthorized")

  const file = formData.get("file") as File | null
  if (!file) throw new Error("No file provided")

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Avatar image must be under 4MB")
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Avatar must be an image file")
  }

  const { url } = await uploadToStorage(file, "avatars")
  return { url }
}
