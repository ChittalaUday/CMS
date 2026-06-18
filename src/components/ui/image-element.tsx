'use client';

import * as React from 'react';
import { PlateElement, PlateElementProps } from 'platejs/react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export function ImageElement({ className, ...props }: PlateElementProps) {
  const element = props.element as any;
  const { url, uploading, error, filename, uploadId, file, progress = 10 } = element;
  const editor = props.editor as any;

  const handleRetry = () => {
    if (editor?.uploadImage && file && uploadId) {
      editor.uploadImage(file, uploadId);
    }
  };

  const handleRemove = () => {
    const entry = editor.api.nodes({
      at: [],
      match: (n: any) => n.type === 'img' && n.uploadId === uploadId
    }).next().value;
    if (entry) {
      const [, path] = entry;
      editor.tf.removeNodes({ at: path });
    }
  };

  return (
    <PlateElement
      className={cn('relative my-4 overflow-hidden rounded-xl border border-border bg-muted/20 p-1.5', className)}
      {...props}
    >
      <div contentEditable={false} className="relative group max-w-full flex items-center justify-center">
        {uploading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/30 text-muted-foreground text-xs rounded-lg border border-dashed border-border/80 w-full min-h-[160px] gap-2 select-none">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="font-semibold text-foreground/80">Uploading image ({progress}%)...</span>
            <div className="w-48 h-1 bg-border rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-primary transition-all duration-350 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground/60 max-w-[200px] truncate mt-1">{filename}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 bg-destructive/5 text-destructive text-xs rounded-lg border border-dashed border-destructive/30 w-full min-h-[160px] gap-3.5 select-none">
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-destructive">Upload failed or timed out</span>
              <span className="text-[10px] text-muted-foreground/75 max-w-[200px] truncate">{filename}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none outline-none"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border-none outline-none"
              >
                <Trash2 className="size-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : url ? (
          <img
            src={url}
            alt="Uploaded content"
            className="block max-w-full max-h-[500px] h-auto rounded-lg mx-auto object-contain shadow-xs border border-border/20"
          />
        ) : (
          <div className="flex items-center justify-center p-8 bg-muted text-muted-foreground text-xs rounded-lg">
            No image URL provided
          </div>
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}

