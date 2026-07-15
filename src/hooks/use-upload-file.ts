import * as React from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { uploadMediaItem } from '@/app/dashboard/blogs/actions';

export type UploadedFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setUploadingFile(file);
    setProgress(10);

    // Set up simulated progress interval
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 150);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const media = await uploadMediaItem(formData);
      clearInterval(progressInterval);

      if (!media) {
        throw new Error("Failed to save media in R2/Database");
      }

      setProgress(100);

      const result: UploadedFile = {
        key: media.id,
        name: media.filename,
        size: media.size,
        type: media.mimeType,
        url: media.url,
      };

      setUploadedFile(result);
      onUploadComplete?.(result);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || 'Something went wrong, please try again.');
      onUploadError?.(error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadingFile(undefined);
      setProgress(0);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown) {
  const unknownError = 'Something went wrong, please try again later.';

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message);
    return errors.join('\n');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return unknownError;
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err);
  return toast.error(errorMessage);
}
