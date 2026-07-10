"use client"

import { useState, useEffect } from "react"
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Image, Upload, Check, Loader2 } from "lucide-react"
import { getMediaItems, uploadMediaItem } from "@/app/dashboard/blogs/actions"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface MediaItem {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface MediaSelectorModalProps {
  onSelect: (media: MediaItem) => void
  triggerText?: string
  selectedMediaId?: string | null
}

export function MediaSelectorModal({ onSelect, triggerText = "Select Image", selectedMediaId }: MediaSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [compressionDialog, setCompressionDialog] = useState<{
    isOpen: boolean
    fileName: string
    fileSizeMB: string
    onConfirm: () => void
    onCancel: () => void
  }>({
    isOpen: false,
    fileName: "",
    fileSizeMB: "0",
    onConfirm: () => {},
    onCancel: () => {},
  })

  useEffect(() => {
    if (isOpen) {
      loadMedia()
    }
  }, [isOpen])

  const loadMedia = async () => {
    try {
      setIsLoading(true)
      const result = await getMediaItems()
      setMediaItems(result.media)
    } catch (err: any) {
      toast.error(err.message || "Failed to load media library")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ""

    try {
      let fileToUpload = file
      if (file.size > 10 * 1024 * 1024 && file.type.startsWith("image/")) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
        const userConfirmed = await new Promise<boolean>((resolve) => {
          setCompressionDialog({
            isOpen: true,
            fileName: file.name,
            fileSizeMB,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })

        setCompressionDialog(prev => ({ ...prev, isOpen: false }))

        if (userConfirmed) {
          try {
            const { compressImageIfNeeded } = await import("@/lib/utils/image-compression")
            fileToUpload = await compressImageIfNeeded(file, 10)
          } catch (compErr) {
            console.error("Compression failed, trying original file:", compErr)
          }
        } else {
          return
        }
      }

      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", fileToUpload)
      
      const newMedia = await uploadMediaItem(formData)
      setMediaItems((prev) => {
        if (prev.some((item) => item.id === newMedia.id)) {
          return prev;
        }
        return [newMedia as any, ...prev];
      })
      toast.success("File uploaded successfully")
    } catch (err: any) {
      toast.error(err.message || "File upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {triggerText ? (
          <Button variant="outline" className="gap-2 text-xs font-semibold h-9">
            <Image className="size-4" />
            {triggerText}
          </Button>
        ) : (
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Insert Image"
          >
            <Image className="size-4" />
          </button>
        )}
      </SheetTrigger>
      
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col h-full">
        <SheetHeader className="pb-2">
          <SheetTitle>Media Library</SheetTitle>
          <SheetDescription>
            Select an image from your library or upload a new file.
          </SheetDescription>
        </SheetHeader>

        {/* Upload bar */}
        <div className="p-4 border border-dashed border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center gap-2 text-center relative">
          {isUploading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Uploading file...</span>
            </div>
          ) : (
            <>
              <Upload className="size-6 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Click to upload image/document
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </>
          )}
        </div>

        {/* Library Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No media items found. Upload some above!
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map((item) => {
                const isSelected = item.id === selectedMediaId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item)
                      setIsOpen(false)
                    }}
                    className={`relative aspect-square rounded-md overflow-hidden border bg-muted group hover:opacity-95 transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    {item.mimeType.startsWith("image/") ? (
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground p-1 text-center truncate">
                        {item.filename}
                      </div>
                    )}
                    
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                          <Check className="size-3" />
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate text-left">
                        {item.filename}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
      <ConfirmDialog
        isOpen={compressionDialog.isOpen}
        title="Compress Image?"
        description={`The image "${compressionDialog.fileName}" is very large (${compressionDialog.fileSizeMB} MB). Next.js limits server action uploads to 10MB. Would you like to compress it to under 10MB to ensure it uploads successfully?`}
        confirmText="Compress & Upload"
        cancelText="Cancel Upload"
        onConfirm={compressionDialog.onConfirm}
        onClose={compressionDialog.onCancel}
      />
    </Sheet>
  )
}
