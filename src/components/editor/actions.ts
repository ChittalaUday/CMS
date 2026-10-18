'use server';

import { uploadToStorage, getImageDimensions } from '@/lib/upload';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { getClientScope } from '@/lib/utils/client-context';
import { freeShaKey } from '@/lib/upload/sha-key';

export async function uploadImageAction(formData: FormData) {
  const user = await getSession();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    const { shaKey, buffer, url } = await uploadToStorage(file, "uploads")

    const clientId = await getClientScope()
    const existing = await prisma.media.findFirst({ where: { shaKey, clientId } })
    if (existing) {
      return { success: true, url: existing.url, media: existing }
    }

    const dimensions = getImageDimensions(buffer, file.type)

    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        userId: user.id,
        shaKey: await freeShaKey(shaKey),
        clientId,
      },
    })

    return { success: true, url, media }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload image'
    throw new Error(message)
  }
}

