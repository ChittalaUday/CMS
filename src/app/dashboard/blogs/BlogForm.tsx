"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RichTextEditor } from "@/components/RichTextEditor"
import { MediaSelectorModal } from "@/components/MediaSelectorModal"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getCategories, createCategory, deleteCategory } from "./actions"
import { toast } from "sonner"
import { Loader2, Plus, Image as ImageIcon, Trash2, Globe, FileText, Settings, Sparkles } from "lucide-react"

interface BlogFormProps {
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
  onSubmit: (data: any) => Promise<any>
}

interface Category {
  id: string
  name: string
}

export default function BlogForm({ initialData, onSubmit }: BlogFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [content, setContent] = useState(initialData?.content || "")
  const [contentJson, setContentJson] = useState(initialData?.contentJson || null)
  const [published, setPublished] = useState(initialData?.published ?? false)
  
  // Featured Image state
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(initialData?.featuredImageId || null)
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(initialData?.featuredImage?.url || null)

  // Categories state
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialData?.categories.map((c) => c.categoryId) || []
  )
  const [newCategoryName, setNewCategoryName] = useState("")

  // Metadata state
  const [seoDescription, setSeoDescription] = useState(initialData?.metadata?.seoDescription || "")
  const [tagsInput, setTagsInput] = useState(initialData?.metadata?.tags?.join(", ") || "")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

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

  // Auto-slug generator
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!initialData) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
      setSlug(generatedSlug)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    try {
      setIsCreatingCategory(true)
      const newCat = await createCategory(newCategoryName.trim())
      setAvailableCategories((prev) => [...prev, newCat])
      setSelectedCategoryIds((prev) => [...prev, newCat.id])
      setNewCategoryName("")
      toast.success("Category added successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to create category")
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      setDeletingCatId(id)
      await deleteCategory(id)
      setAvailableCategories((prev) => prev.filter((cat) => cat.id !== id))
      setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id))
      toast.success("Category deleted successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category")
    } finally {
      setDeletingCatId(null)
    }
  }

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    )
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!slug.trim()) {
      toast.error("Slug is required")
      return
    }

    try {
      setIsSubmitting(true)
      
      const parsedTags = tagsInput
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0)

      await onSubmit({
        title,
        slug,
        content,
        contentJson,
        published,
        featuredImageId,
        categoryIds: selectedCategoryIds,
        metadata: {
          seoDescription,
          tags: parsedTags,
        },
      })

      toast.success(initialData ? "Post updated successfully" : "Post created successfully")
      router.push("/dashboard/blogs")
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Editor & Core Settings (3 cols) */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border border-border/40 bg-zinc-950/20 backdrop-blur-xs shadow-md">
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/80">Post Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter a catchy title..."
                className="text-lg font-bold bg-background/50 border-border/60 focus:border-primary/80 focus:ring-primary/20 h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/80">Slug / URL</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground/60 text-xs select-none">
                  /blogs/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-friendly-slug"
                  className="pl-16 bg-background/50 border-border/60 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/80 flex items-center gap-1.5 mb-1">
                <FileText className="size-4 text-primary/70" />
                Content Editor
              </Label>
              <RichTextEditor
                content={content}
                contentJson={contentJson}
                onChange={(html, json) => {
                  setContent(html)
                  setContentJson(json)
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic metadata / custom fields */}
        <Card className="border border-border/40 bg-zinc-950/20 backdrop-blur-xs shadow-md">
          <CardHeader className="pb-3 border-b border-border/45 bg-muted/10">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Metadata & SEO (Dynamic Fields)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Extensible custom fields stored directly as a JSON payload on the Post record.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seoDesc" className="text-xs font-semibold text-muted-foreground/95">SEO Meta Description</Label>
              <Input
                id="seoDesc"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Write a summary description for search engines..."
                className="bg-background/50 border-border/60 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-xs font-semibold text-muted-foreground/95">Tags (Comma-separated)</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. technology, database, tutorial"
                className="bg-background/50 border-border/60 text-sm font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Publishing, Category, Featured Image (1 col) */}
      <div className="lg:col-span-1 space-y-6">
        {/* Publish Action Card */}
        <Card className="border border-border/40 bg-zinc-950/20 backdrop-blur-xs shadow-md">
          <CardHeader className="pb-3 border-b border-border/45 bg-muted/10">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Publication</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <span className="text-xs font-semibold text-muted-foreground">Status</span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                published ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              }`}>
                {published ? "Published" : "Draft"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-1">
              <Label htmlFor="published-switch" className="cursor-pointer text-xs font-medium text-muted-foreground">
                Publish immediately
              </Label>
              <Switch
                id="published-switch"
                checked={published}
                onCheckedChange={setPublished}
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button type="submit" className="w-full gap-2 font-semibold shadow-sm h-9" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Globe className="size-4" />
                )}
                {initialData ? "Save Changes" : "Publish Post"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-border/60 font-semibold h-9"
                onClick={() => router.push("/dashboard/blogs")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Featured Image Selector */}
        <Card className="border border-border/40 bg-zinc-950/20 backdrop-blur-xs shadow-md">
          <CardHeader className="pb-3 border-b border-border/45 bg-muted/10">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Featured Image</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {featuredImageUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border/60 bg-muted/50 shadow-inner group">
                <img
                  src={featuredImageUrl}
                  alt="Featured image preview"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="shadow-sm size-8"
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
              <div className="border border-dashed border-border/80 rounded-lg p-5 flex flex-col items-center justify-center text-center gap-2 bg-muted/5">
                <ImageIcon className="size-7 text-muted-foreground/45" />
                <span className="text-[10px] text-muted-foreground">
                  Pick a high-resolution banner image.
                </span>
              </div>
            )}

            <div className="flex justify-center">
              <MediaSelectorModal
                selectedMediaId={featuredImageId}
                onSelect={(media) => {
                  setFeaturedImageId(media.id)
                  setFeaturedImageUrl(media.url)
                }}
                triggerText={featuredImageUrl ? "Replace Banner" : "Choose Image"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories Card */}
        <Card className="border border-border/40 bg-zinc-950/20 backdrop-blur-xs shadow-md">
          <CardHeader className="pb-3 border-b border-border/45 bg-muted/10">
            <CardTitle className="text-base font-semibold">Categories</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* List current categories */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border/50 rounded-lg p-2.5 bg-background/50 shadow-inner">
              {availableCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-5">
                  No categories defined.
                </p>
              ) : (
                availableCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between group p-1.5 rounded hover:bg-muted/30 transition-colors"
                  >
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none flex-1">
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="font-medium">{cat.name}</span>
                    </label>
                    
                    <button
                      type="button"
                      disabled={deletingCatId === cat.id}
                      onClick={(e) => handleDeleteCategory(cat.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 p-1 rounded transition-all disabled:opacity-50 text-muted-foreground/60 hover:text-destructive"
                      title="Delete category"
                    >
                      {deletingCatId === cat.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new category inline */}
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                className="text-xs bg-background/50 h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0 border-border/60"
                onClick={handleAddCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
              >
                {isCreatingCategory ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
