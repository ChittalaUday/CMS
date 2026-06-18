'use server';

import crypto from 'crypto';
import { uploadToR2 } from '@/lib/s3';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getImageDimensions } from '@/lib/image-metadata';

export async function uploadImageAction(formData: FormData) {
  const user = await getSession();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    throw new Error('No file provided');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Compute SHA-256 hash of the file content for deduplication
  const shaKey = crypto.createHash('sha256').update(buffer).digest('hex');

  try {
    // Check if the file already exists in the database
    const existing = await prisma.media.findUnique({
      where: { shaKey },
    });

    if (existing) {
      return {
        success: true,
        url: existing.url,
        media: existing,
      };
    }

    // Clean filename to prevent directory traversal/weird characters
    const cleanFilename = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${cleanFilename}`;

    // Upload buffer to Cloudflare R2 and get public URL
    const fileUrl = await uploadToR2(key, buffer, file.type);

    const dimensions = getImageDimensions(buffer, file.type);

    // Save record to Database under Media table
    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: fileUrl,
        mimeType: file.type,
        size: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        userId: user.id,
        shaKey,
      },
    });

    return {
      success: true,
      url: fileUrl,
      media,
    };
  } catch (error: any) {
    console.error('R2 upload action error:', error);
    throw new Error(error.message || 'Failed to upload image to Cloudflare R2');
  }
}

