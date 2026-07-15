"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { getMediaItems, uploadMediaItem, deleteMediaItem } from "../blogs/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Upload, Copy, Trash2, Check, Loader2, ImageIcon, FileText, ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { copyToClipboard as utilCopyToClipboard, getErrorMessage } from "@/lib/utils/utils"

type MediaItem = Awaited<ReturnType<typeof getMediaItems>>["media"][number]

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 24

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

  const selectedItemRef = useRef(selectedItem)
  useEffect(() => {
    selectedItemRef.current = selectedItem
  }, [selectedItem])

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await getMediaItems({ search, type, page, pageSize })
      setMediaItems(result.media)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
      setPage(result.page)
      if (result.media.length === 0 && selectedItemRef.current) {
        setSelectedItem(null)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load media library"))
    } finally {
      setIsLoading(false)
    }
  }, [search, type, page, pageSize])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on dependency change, not derived state
    loadMedia()
  }, [loadMedia])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
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
            continue
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
          return [newMedia, ...prev];
        })
      }
      toast.success("Uploaded successfully")
      setPage(1)
    } catch (err) {
      toast.error(getErrorMessage(err, "Upload failed"))
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await deleteMediaItem(itemToDelete)
      setMediaItems((prev) => prev.filter((item) => item.id !== itemToDelete))
      if (selectedItem?.id === itemToDelete) {
        setSelectedItem(null)
      }
      toast.success("File deleted successfully")
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete file"))
    }
  }

  const copyToClipboard = (url: string, id: string) => {
    const fullUrl = url.startsWith("http://") || url.startsWith("https://") 
      ? url 
      : `${window.location.origin}${url}`
    utilCopyToClipboard(fullUrl).then((success) => {
      if (success) {
        setCopiedId(id)
        toast.success("Copied file URL to clipboard")
        setTimeout(() => setCopiedId(null), 2000)
      } else {
        toast.error("Failed to copy URL")
      }
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 py-3">
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Asset"
        description="Are you sure you want to delete this file permanently? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-foreground">
            Media Library
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Upload, inspect, and copy links to images or document files for your articles.
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-lg">
          <Button className="gap-2 shadow-md font-semibold h-10 bg-primary text-primary-foreground" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload Files
          </Button>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={isUploading}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-center">
        <div className="relative w-full max-w-xl">
          <Input
            placeholder="Search media by filename or MIME type…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-3 bg-muted/40 border-border"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="media-type-filter" className="sr-only">File type</label>
          <select
            id="media-type-filter"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="all">All file types</option>
            <option value="image">Images</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Gallery Grid */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="min-h-[350px] border border-dashed border-border/80 rounded-2xl flex flex-col justify-center items-center text-center p-8 bg-muted/10 backdrop-blur-xs">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-inner">
                <ImageIcon className="size-8 text-muted-foreground/60" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-foreground">Your Library is Empty</h3>
              <p className="text-muted-foreground text-xs max-w-sm mb-4">
                Drag and drop files or use the upload button to add images to your repository.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mediaItems.map((item) => {
                const isSelected = selectedItem?.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group relative aspect-square rounded-xl overflow-hidden border bg-card/40 cursor-pointer shadow-xs hover:shadow-md hover:border-border transition-all duration-200 ${
                      isSelected ? "border-primary ring-2 ring-primary/25" : "border-border/60"
                    }`}
                  >
                    {item.mimeType.startsWith("image/") ? (
                      <Image
                        src={item.url}
                        alt={item.filename}
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <FileText className="size-8 text-muted-foreground/50 mb-2" />
                        <span className="text-xs font-semibold truncate max-w-full">
                          {item.filename}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center backdrop-blur-xs">
                      <p className="text-[10px] text-white truncate max-w-[70%] font-medium">
                        {item.filename}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(item.url, item.id)
                        }}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                      >
                        {copiedId === item.id ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-3 bg-muted/70 border border-border/80 rounded-xl">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} · {totalCount} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isLoading}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detailed Inspector Panel */}
        <div className="lg:col-span-1">
          {selectedItem ? (
            <Card className="border border-border/60 bg-card/45 backdrop-blur-xs shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-semibold text-foreground">Asset Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="relative aspect-video bg-muted border border-border rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                  {selectedItem.mimeType.startsWith("image/") ? (
                    <Image
                      src={selectedItem.url}
                      alt={selectedItem.filename}
                      fill
                      sizes="300px"
                      className="object-contain"
                    />
                  ) : (
                    <FileText className="size-10 text-muted-foreground/60" />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-sm break-all leading-snug text-foreground">
                      {selectedItem.filename}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Uploaded on {new Date(selectedItem.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-border/60 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">MIME Type:</span>
                      <span className="font-semibold truncate max-w-[150px] text-foreground" title={selectedItem.mimeType}>
                        {selectedItem.mimeType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">File Size:</span>
                      <span className="font-semibold text-foreground">{formatSize(selectedItem.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Uploaded By:</span>
                      <span className="font-semibold truncate max-w-[120px] text-foreground">
                        {selectedItem.user?.name || selectedItem.user?.email}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs font-semibold h-8.5"
                      onClick={() => copyToClipboard(selectedItem.url, selectedItem.id)}
                    >
                      {copiedId === selectedItem.id ? (
                        <>
                          <Check className="size-3.5" />
                          Copied Link
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs font-semibold h-8.5"
                      asChild
                    >
                      <a href={selectedItem.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" />
                        View Open
                      </a>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2 text-xs font-semibold h-8.5"
                      onClick={() => handleDeleteClick(selectedItem.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete Asset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-muted/10 rounded-xl border border-border/60 border-dashed p-6 text-center text-xs text-muted-foreground/80 sticky top-6">
              Select an image/asset from the library to view details, copy URLs, or delete.
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={compressionDialog.isOpen}
        title="Compress Image?"
        description={`The image "${compressionDialog.fileName}" is very large (${compressionDialog.fileSizeMB} MB). Next.js limits server action uploads to 10MB. Would you like to compress it to under 10MB to ensure it uploads successfully?`}
        confirmText="Compress & Upload"
        cancelText="Cancel Upload"
        onConfirm={compressionDialog.onConfirm}
        onClose={compressionDialog.onCancel}
      />
    </div>
  )
}
