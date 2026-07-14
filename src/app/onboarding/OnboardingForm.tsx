"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { completeOnboarding } from "@/app/_actions/onboarding"
import { uploadAvatar } from "@/app/_actions/upload"
import {
  Loader2Icon,
  UserIcon,
  LinkIcon,
  FileTextIcon,
  ArrowRightIcon,
  UploadIcon,
} from "lucide-react"

export function OnboardingForm({
  initialName,
  initialAvatarUrl,
}: {
  initialName: string
  initialAvatarUrl: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSkipping, setIsSkipping] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarMode, setAvatarMode] = useState<"url" | "upload">("url")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadAvatar(formData)
      if (res?.url) {
        setAvatarUrl(res.url)
        toast.success("Photo uploaded")
      }
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || err))
    } finally {
      setIsUploading(false)
    }
  }

  function submit(skip: boolean) {
    startTransition(async () => {
      if (skip) setIsSkipping(true)
      try {
        await completeOnboarding(skip ? {} : { name, bio, avatarUrl })
        toast.success(skip ? "Skipped — update your profile anytime in Settings." : "Profile saved!")
        router.push("/dashboard")
        router.refresh()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong."
        toast.error(message)
      } finally {
        if (skip) setIsSkipping(false)
      }
    })
  }

  const isBusy = isPending || isUploading

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <LinkIcon className="size-3" />
          Profile Picture <span className="normal-case font-normal">(optional)</span>
        </Label>

        {avatarUrl && (
          <div className="flex items-center gap-2 pb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt="Preview"
              className="size-10 rounded-full object-cover border border-border/60"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <span className="text-xs text-muted-foreground">Preview</span>
          </div>
        )}

        <Tabs
          value={avatarMode}
          onValueChange={(v) => setAvatarMode(v as "url" | "upload")}
        >
          <TabsList className="h-8 bg-muted/40 border border-border/60">
            <TabsTrigger value="url" className="h-7 text-xs gap-1.5">
              <LinkIcon className="size-3" /> URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="h-7 text-xs gap-1.5">
              <UploadIcon className="size-3" /> Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-2">
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              type="url"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 text-sm border-border/60"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="size-4" />
              )}
              {isUploading ? "Uploading…" : "Choose a photo"}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              JPG, PNG, WebP · max 4 MB
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Display name */}
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
        >
          <UserIcon className="size-3" />
          Display Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="h-9 bg-muted/30 border-border/80 text-sm"
          maxLength={80}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label
          htmlFor="bio"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
        >
          <FileTextIcon className="size-3" />
          Bio <span className="normal-case font-normal">(optional)</span>
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short bio about yourself…"
          className="bg-muted/30 border-border/80 text-sm resize-none min-h-[80px]"
          maxLength={200}
        />
        <p className="text-[10px] text-muted-foreground text-right">{bio.length}/200</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-9 text-sm border-border/60"
          onClick={() => submit(true)}
          disabled={isBusy}
        >
          {isSkipping && isPending ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
          Skip for now
        </Button>
        <Button
          type="button"
          className="flex-1 h-9 text-sm font-semibold gap-1.5"
          onClick={() => submit(false)}
          disabled={isBusy}
        >
          {!isSkipping && isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ArrowRightIcon className="size-4" />
          )}
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
