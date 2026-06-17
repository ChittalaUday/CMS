"use client"

import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { ChevronLeft, ChevronRight, Loader2, FileX, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"

// Point PDF.js to the bundled worker shipped with react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface PdfViewerProps {
  url: string
  /** Optional: route a CORS-hostile URL through your own proxy */
  useProxy?: boolean
}

export default function PdfViewer({ url, useProxy = true }: PdfViewerProps) {
  const proxiedUrl = useProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url

  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [error, setError] = useState<string | null>(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setCurrentPage(1)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error("PDF load error:", err)
    setError(err.message || "Failed to load document")
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6 text-center">
        <FileX className="size-10 opacity-40" />
        <p className="text-xs font-semibold">Could not render document</p>
        <p className="text-[11px] opacity-70 max-w-[200px]">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/50 border-b border-border/40 shrink-0 flex-wrap">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground font-mono min-w-[60px] text-center">
            {numPages > 0 ? `${currentPage} / ${numPages}` : "—"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={scale <= 0.5}
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground font-mono w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={scale >= 2.5}
            onClick={() => setScale((s) => Math.min(2.5, +(s + 0.25).toFixed(2)))}
          >
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="flex-1 overflow-auto bg-muted/30 flex justify-center py-3 px-2">
        <Document
          file={proxiedUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading document…</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <FileX className="size-8 opacity-40" />
              <span className="text-xs font-semibold">Failed to load PDF</span>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-md rounded overflow-hidden"
          />
        </Document>
      </div>
    </div>
  )
}
