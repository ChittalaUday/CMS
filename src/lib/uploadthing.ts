import type { FileRouter } from 'uploadthing/next';

import { createUploadthing } from 'uploadthing/next';
import { getSession } from '@/lib/session';

const f = createUploadthing();

export const ourFileRouter = {
  avatarUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await getSession()
      if (!user) throw new Error("Unauthorized")
      return { userId: user.id }
    })
    .onUploadComplete(({ file }) => ({
      url: file.ufsUrl,
    })),

  editorUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 20 },
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    video: { maxFileSize: "512MB", maxFileCount: 3 },
    audio: { maxFileSize: "64MB", maxFileCount: 10 },
    text: { maxFileSize: "4MB", maxFileCount: 10 },
    blob: { maxFileSize: "32MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await getSession();
      if (!user) throw new Error('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(({ file }) => ({
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
