"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plate, usePlateEditor } from "platejs/react"
import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit"
import { TableKit } from "@/components/editor/plugins/table-kit"
import { Toolbar } from "@/components/ui/toolbar"
import { BasicToolbarButtons } from "@/components/ui/basic-toolbar-buttons"
import { Editor, EditorContainer } from "@/components/ui/editor"
import { MediaSelectorModal } from "@/components/MediaSelectorModal"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Cloud, Eye, Send, ArrowLeft, Image as ImageIcon,
  Trash2, Plus, Loader2, X, ChevronDown, ChevronUp
} from "lucide-react"
import { getCategories, createCategory } from "@/app/dashboard/blogs/actions"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
}

interface MediaItem {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface EditorialEditorProps {
  initialData?: {
    id: string
    title: string
    slug: string
    content: string
    contentJson?: any
    published: boolean
    featuredImageId?: string | null
    featuredImage?: { url: string; filename: string } | null
    categories: Array<{ categoryId: string }>
    metadata?: any
  }
  user: {
    name: string | null
    email: string
    role: string
  }
  onSubmit: (data: any) => Promise<any>
}

// Custom Slate to HTML serializer
function serializeSlateToHtml(nodes: any[]): string {
  if (!nodes) return ""
  return nodes.map(node => {
    if (!node) return ""

    // Leaf node (text)
    if (node.text !== undefined) {
      let html = node.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      if (node.bold) html = `<strong>${html}</strong>`
      if (node.italic) html = `<em>${html}</em>`
      if (node.underline) html = `<u>${html}</u>`
      if (node.strikethrough) html = `<s>${html}</s>`
      if (node.code) html = `<code>${html}</code>`
      return html
    }

    // Element node
    const childrenHtml = serializeSlateToHtml(node.children || [])
    switch (node.type) {
      case 'table':
        return `<table>${childrenHtml}</table>`
      case 'tr':
        return `<tr>${childrenHtml}</tr>`
      case 'td':
        return `<td>${childrenHtml}</td>`
      case 'th':
        return `<th>${childrenHtml}</th>`
      case 'h1':
        return `<h1>${childrenHtml}</h1>`
      case 'h2':
        return `<h2>${childrenHtml}</h2>`
      case 'blockquote':
        return `<blockquote>${childrenHtml}</blockquote>`
      case 'hr':
        return `<hr />`
      case 'img':
        return `<img src="${node.url}" alt="" />`
      case 'p':
      default:
        return `<p>${childrenHtml}</p>`
    }
  }).join("")
}

// Custom HTML to Slate deserializer
function deserializeHtmlToSlate(html: string): any[] {
  if (!html) return [{ type: 'p', children: [{ text: '' }] }]
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const nodes: any[] = []

    const parseNode = (el: Node): any => {
      if (el.nodeType === Node.TEXT_NODE) {
        return { text: el.textContent || "" }
      }
      if (el.nodeType !== Node.ELEMENT_NODE) {
        return null
      }
      const element = el as HTMLElement
      const children = Array.from(element.childNodes).map(parseNode).filter(Boolean)

      const tag = element.tagName.toLowerCase()
      switch (tag) {
        case 'table':
          return { type: 'table', children: children.length ? children : [{ text: '' }] }
        case 'tr':
          return { type: 'tr', children: children.length ? children : [{ text: '' }] }
        case 'td':
          return { type: 'td', children: children.length ? children : [{ text: '' }] }
        case 'th':
          return { type: 'th', children: children.length ? children : [{ text: '' }] }
        case 'h1':
          return { type: 'h1', children: children.length ? children : [{ text: '' }] }
        case 'h2':
          return { type: 'h2', children: children.length ? children : [{ text: '' }] }
        case 'blockquote':
          return { type: 'blockquote', children: children.length ? children : [{ text: '' }] }
        case 'hr':
          return { type: 'hr', children: [{ text: '' }] }
        case 'img':
          return { type: 'img', url: element.getAttribute('src') || '', children: [{ text: '' }] }
        case 'strong':
        case 'b':
          return children.map(c => ({ ...c, bold: true }))
        case 'em':
        case 'i':
          return children.map(c => ({ ...c, italic: true }))
        case 'u':
          return children.map(c => ({ ...c, underline: true }))
        case 's':
        case 'strike':
          return children.map(c => ({ ...c, strikethrough: true }))
        case 'code':
          return children.map(c => ({ ...c, code: true }))
        case 'p':
        default:
          return { type: 'p', children: children.length ? children : [{ text: '' }] }
      }
    }

    Array.from(doc.body.childNodes).forEach(child => {
      const parsed = parseNode(child)
      if (Array.isArray(parsed)) {
        nodes.push(...parsed)
      } else if (parsed) {
        nodes.push(parsed)
      }
    })

    return nodes.length > 0 ? nodes : [{ type: 'p', children: [{ text: '' }] }]
  } catch (e) {
    return [{ type: 'p', children: [{ text: html.replace(/<[^>]*>/g, '') }] }]
  }
}

export function EditorialEditor({ initialData, user, onSubmit }: EditorialEditorProps) {
  const router = useRouter()

  // Role-based permissions
  const canPublish = user.role === "SUPER_ADMIN" || user.role === "ADMIN"
  // Editor core state
  const [title, setTitle] = useState(initialData?.title || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [published, setPublished] = useState(initialData?.published ?? false)
  const [isSavingStatus, setIsSavingStatus] = useState("Saved to Drafts")

  // Sidebars & layout
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // Featured Image
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(initialData?.featuredImageId || null)
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(initialData?.featuredImage?.url || null)

  // Categories
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialData?.categories.map((c) => c.categoryId) || []
  )
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  // Tags
  const [tags, setTags] = useState<string[]>(initialData?.metadata?.tags || [])
  const [tagInput, setTagInput] = useState("")

  // SEO
  const [seoDescription, setSeoDescription] = useState(initialData?.metadata?.seoDescription || "")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track whether the user has interacted — prevents auto-save on initial mount
  const hasUserInteracted = useRef(false)
  const isFirstMount = useRef(true)

  // Dedicated timer ref for the 1-second keyboard-stop debounce
  const contentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Word & Character count
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  // Initial value parsing
  const initialValue = useMemo(() => {
    if (initialData?.contentJson && Array.isArray(initialData.contentJson)) {
      return initialData.contentJson
    }
    if (initialData?.content) {
      return deserializeHtmlToSlate(initialData.content)
    }
    return [{ type: 'p', children: [{ text: '' }] }]
  }, [])

  // Initialize Plate Editor with BasicNodesKit and TableKit
  const editor = usePlateEditor({
    value: initialValue,
    plugins: [...BasicNodesKit, ...TableKit]
  })

  // Handle stats updates
  useEffect(() => {
    if (!editor) return
    const updateStats = () => {
      const text = editor.children
        .map((n: any) => (n.children || []).map((c: any) => c.text || "").join(""))
        .join(" ")
        .trim()
      const words = text ? text.split(/\s+/).length : 0
      setWordCount(words)
      setCharCount(text.length)
    }

    updateStats()
  }, [editor, editor.children])

  // Mark first mount as done after initial render
  useEffect(() => {
    isFirstMount.current = false
  }, [])

  // Shared auto-save helper — called by both content onChange and field-level effect.
  // Shows "Saving draft..." for at least 1 second so it's always readable.
  const triggerAutoSave = (children?: any[]) => {
    if (!initialData?.id) return
    if (!title.trim() || !slug.trim()) return

    setIsSavingStatus("Saving draft...")

    const minDelay = new Promise<void>((res) => setTimeout(res, 1000))
    const save = onSubmit({
      title,
      slug,
      content: serializeSlateToHtml(children ?? editor.children),
      contentJson: children ?? editor.children,
      published,
      featuredImageId,
      categoryIds: selectedCategoryIds,
      metadata: { seoDescription, tags },
    })

    Promise.all([save, minDelay])
      .then(() => setIsSavingStatus("Saved to Drafts"))
      .catch(() => setIsSavingStatus("Failed to Save"))
  }

  // ─── 1-second debounce on keyboard interaction (content changes) ───────────
  // Called from Plate's onChange — clears and resets the timer on every keystroke
  const handleEditorChange = ({ value }: { value: any[] }) => {
    hasUserInteracted.current = true

    if (contentSaveTimer.current) {
      clearTimeout(contentSaveTimer.current)
    }

    contentSaveTimer.current = setTimeout(() => {
      triggerAutoSave(value)
    }, 1000)
  }

  // ─── 2-second debounce on metadata / field changes ─────────────────────────
  // Watches slug, categories, tags, etc. — NOT editor.children (handled above)
  useEffect(() => {
    if (isFirstMount.current) return
    if (!hasUserInteracted.current) return

    const timer = setTimeout(() => {
      triggerAutoSave()
    }, 2000)

    return () => clearTimeout(timer)
  }, [
    title,
    slug,
    published,
    featuredImageId,
    selectedCategoryIds,
    seoDescription,
    tags,
    initialData?.id,
  ])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const cats = await getCategories()
      setAvailableCategories(cats)
    } catch (err) {
      toast.error("Failed to load categories")
    }
  }

  const handleTitleChange = (val: string) => {
    hasUserInteracted.current = true
    setTitle(val)
    if (!initialData) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
      setSlug(generatedSlug)
    }
  }

  // Tags controllers
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags((prev) => [...prev, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (indexToRemove: number) => {
    setTags((prev) => prev.filter((_, i) => i !== indexToRemove))
  }

  // Categories controllers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    try {
      setIsCreatingCategory(true)
      const newCat = await createCategory(newCategoryName.trim())
      setAvailableCategories((prev) => [...prev, newCat])
      setSelectedCategoryIds((prev) => [...prev, newCat.id])
      setNewCategoryName("")
      toast.success("Category added")
    } catch (err: any) {
      toast.error(err.message || "Failed to create category")
    } finally {
      setIsCreatingCategory(false)
    }
  }



  const handleFormSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    if (!slug.trim()) {
      toast.error("Please enter a URL slug")
      return
    }
    if (!editor) return

    try {
      setIsSubmitting(true)
      await onSubmit({
        title,
        slug,
        content: serializeSlateToHtml(editor.children),
        contentJson: editor.children,
        published,
        featuredImageId,
        categoryIds: selectedCategoryIds,
        metadata: {
          seoDescription,
          tags,
        },
      })
      toast.success(initialData ? "Post saved successfully" : "Post published successfully")
      router.push("/dashboard/blogs")
    } catch (err: any) {
      toast.error(err.message || "Failed to save post")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Plate editor={editor} onChange={handleEditorChange}>
      <div className="flex flex-col flex-1 bg-background rounded-lg font-sans text-foreground antialiased overflow-hidden select-none -mx-4 -mb-4 h-[calc(100vh-4rem)]">

        {/* 1. Header */}
        <header className="h-14  backdrop-blur-md flex items-center justify-between px-6 shrink-0 shadow-sm shadow-indigo-500/5 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/blogs")}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mr-1"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-4" />
            </button>

            <span className="text-lg font-semibold ">Editorial</span>
            <div className="w-[1px] h-4 bg-indigo-500/20" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Cloud className="size-3.5 text-indigo-400/80" />
              <span>{isSavingStatus}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* Preview — admin/super-admin only */}
            {canPublish && initialData?.slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/posts/${initialData.slug}`, "_blank")}
                className="h-8 text-xs font-semibold px-3 gap-1.5 rounded-md border-border/60 hover:bg-muted"
                title="Preview post"
              >
                <Eye className="size-3.5" />
                Preview
              </Button>
            )}

            <Button
              onClick={handleFormSubmit}
              disabled={isSubmitting}
              className="h-8 text-xs font-semibold px-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded-md gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {canPublish
                ? published ? "Update & Publish" : "Publish"
                : "Save Draft"}
            </Button>

          </div>
        </header>

        {/* 2. Main Area */}
        <div className="flex flex-1 min-h-0 bg-background/50">

          {/* Editor Writing Workspace */}
          <main className="flex-1 bg-card/10 flex flex-row min-h-0 relative">

            {/* Toolbar outside canvas (Left side toolbar) */}
            <div className="flex flex-col items-center py-16 px-4 bg-background/30 shrink-0 z-20">
              <Toolbar className="flex-col gap-2 w-fit bg-muted rounded-xl px-2 py-3">
                <BasicToolbarButtons orientation="vertical" />
              </Toolbar>
            </div>


            {/* Scrollable canvas */}
            <div className="flex-1 overflow-y-auto px-12 py-16 flex justify-center">

              <div className="max-w-2xl w-full space-y-6 flex flex-col relative" id="editor-workspace-canvas">

                {/* Title input */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter post title..."
                  className="w-full text-4xl font-extrabold tracking-tight text-foreground placeholder:text-muted-foreground/35 focus:outline-none border-none p-0 bg-transparent"
                />

                <EditorContainer className="pt-0 mt-0 mb-0 border-0 shadow-none">
                  <Editor
                    variant="none"
                    className="size-full pt-2 pb-72 mt-0 text-base focus-visible:outline-none"
                    placeholder="Start writing your story..."
                  />
                </EditorContainer>

              </div>

            </div>
          </main>

          {/* Right Sidebar - Post Settings */}
          <aside className="w-80 border-l border-border bg-card flex flex-col p-6 overflow-y-auto shrink-0 select-none space-y-6 rounded-xl my-8 mr-4">
            <div>
              <h2 className="font-bold text-base text-foreground">Post Settings</h2>
              <p className="text-xs text-muted-foreground">Configure metadata and categorization.</p>
            </div>

            {/* URL Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL Slug</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs text-muted-foreground/60 font-medium">/posts/</span>
                <Input
                  id="slug-input"
                  value={slug}
                  onChange={(e) => { hasUserInteracted.current = true; setSlug(e.target.value) }}
                  className="pl-16 h-9 bg-muted/30 border-border/80 text-xs font-mono text-foreground"
                />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>

              <div className="space-y-2">
                <select
                  value={selectedCategoryIds[0] || ""}
                  onChange={(e) => { hasUserInteracted.current = true; setSelectedCategoryIds(e.target.value ? [e.target.value] : []) }}
                  className="w-full h-9 rounded-md border border-border/80 bg-muted/30 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground"
                >
                  <option value="">Select category...</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {/* Add category inline */}
                <div className="flex gap-1.5">
                  <Input
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-8 text-[11px] bg-muted/30 border-border/80"
                  />
                  <Button
                    onClick={handleAddCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95 font-semibold"
                  >
                    {isCreatingCategory ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</Label>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={tag + idx}
                      className="inline-flex items-center gap-1 bg-muted text-foreground text-[10px] px-2 py-0.5 rounded font-semibold border border-border/60"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="h-9 bg-muted/30 border-border/80 text-xs"
              />
            </div>

            {/* Featured Image upload picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Featured Image</Label>

              {featuredImageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center group">
                  <img
                    src={featuredImageUrl}
                    alt="Featured banner preview"
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="size-8 shadow-sm"
                      onClick={() => {
                        setFeaturedImageId(null)
                        setFeaturedImageUrl(null)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border/80 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 bg-muted/20">
                  <ImageIcon className="size-7 text-muted-foreground/45" />
                  <span className="text-[10px] text-muted-foreground/60">No banner selected.</span>
                </div>
              )}

              <div className="flex justify-center">
                <MediaSelectorModal
                  selectedMediaId={featuredImageId}
                  onSelect={(media) => {
                    setFeaturedImageId(media.id)
                    setFeaturedImageUrl(media.url)
                  }}
                  triggerText={featuredImageUrl ? "Change Image" : "Choose Image"}
                />
              </div>
            </div>

            {/* Advanced Settings Accordion */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                <span>Advanced Settings</span>
                {isAdvancedOpen ? <ChevronUp className="size-3.5 text-muted-foreground/60" /> : <ChevronDown className="size-3.5 text-muted-foreground/60" />}
              </button>

              {isAdvancedOpen && (
                <div className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo-description" className="text-xs font-semibold text-muted-foreground uppercase">SEO Meta Description</Label>
                    <Input
                      id="seo-description"
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Provide a summary meta description..."
                      className="bg-muted/30 border-border/80 text-xs h-9"
                    />
                  </div>

                  {/* Publish toggle — admin/super-admin only */}
                  {canPublish && (
                    <div className="flex items-center justify-between py-1 px-1">
                      <Label htmlFor="published-toggle" className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase">Publish Post Immediately</Label>
                      <Switch
                        id="published-toggle"
                        checked={published}
                        onCheckedChange={(v) => { hasUserInteracted.current = true; setPublished(v) }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* 3. Footer */}
        <footer className="h-8 rounded-md mx-2 mb-2 bg-card flex items-center justify-between px-6 shrink-0 text-[10px] text-muted-foreground font-medium font-mono select-none">
          <div className="flex items-center gap-4">
            <span>Words: {wordCount}</span>
            <span>Characters: {charCount}</span>
          </div>
        </footer>

      </div>
    </Plate>
  )
}
