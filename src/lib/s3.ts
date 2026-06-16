import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"

let client: S3Client | null = null
const bucket = process.env.CLOUDFLARE_R2_BUCKET || "test"

function getClient(): S3Client {
  if (!client) {
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Cloudflare R2 is not configured. Set CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY."
      )
    }

    client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const s3 = getClient()
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL
  if (publicUrlBase) {
    const trimmedBase = publicUrlBase.endsWith("/") ? publicUrlBase.slice(0, -1) : publicUrlBase
    return `${trimmedBase}/${key}`
  }

  // Fallback url
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || ""
  const trimmedEndpoint = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint
  return `${trimmedEndpoint}/${bucket}/${key}`
}

export async function deleteFromR2(key: string): Promise<void> {
  const s3 = getClient()
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
}
