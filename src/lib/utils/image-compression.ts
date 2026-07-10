import imageCompression from "browser-image-compression"

/**
 * Compress an image in the browser if it exceeds a certain threshold.
 * Uses the browser-image-compression library.
 */
export async function compressImageIfNeeded(file: File, maxSizeMB = 5): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Only compress if the file exceeds the size and is an image
  if (file.size <= maxSizeBytes || !file.type.startsWith("image/")) {
    return file
  }

  try {
    const options = {
      maxSizeMB,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
    }
    const compressedBlob = await imageCompression(file, options)
    
    // Convert Blob to File, preserving original name and type
    return new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error("Image compression failed, using original file", error)
    return file
  }
}
