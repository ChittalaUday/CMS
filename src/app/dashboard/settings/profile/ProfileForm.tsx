"use client"

import { useState, useTransition, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAction } from "next-safe-action/hooks"
import { updateProfile } from "@/app/_actions/settings"
import { useUploadThing } from "@/lib/uploadthing-react"
import { Loader2, LinkIcon, UploadIcon, AtSignIcon, UserIcon, FileTextIcon } from "lucide-react"

interface ProfileFormProps {
  initialUsername: string
  initialName: string
  initialBio: string
  initialAvatarUrl: string
}

export function ProfileForm({
  initialUsername,
  initialName,
  initialBio,
  initialAvatarUrl,
}: ProfileFormProps) {
  const [username, setUsername] = useState(initialUsername)
  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarMode, setAvatarMode] = useState<"url" | "upload">("url")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const { startUpload } = useUploadThing("avatarUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        setAvatarUrl(res[0].url)
        toast.success("Photo uploaded")
      }
      setIsUploading(false)
    },
    onUploadError: (e) => {
      toast.error("Upload failed: " + e.message)
      setIsUploading(false)
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    await startUpload([file])
  }

  const { execute } = useAction(updateProfile, {
    onSuccess: () => toast.success("Profile saved"),
    onError: ({ error }) => toast.error(error.serverError ?? "Failed to save profile"),
  })

  const usernameError =
    username.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(username)
      ? "Only letters, numbers, _ and - allowed"
      : null

  function handleSave() {
    startTransition(() => {
      execute({ username, name, bio, avatarUrl })
    })
  }

  const displayName = name || username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Personal Info</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your name, username, and bio visible to team members.
        </p>
      </div>
      <Separator className="border-border/40" />

      {/* Avatar picker */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Profile Picture
        </Label>

        {avatarUrl && (
          <div className="flex items-center gap-3 pb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-14 rounded-full object-cover border-2 border-border/60 shadow-sm"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <button
              type="button"
              onClick={() => setAvatarUrl("")}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {!avatarUrl && (
          <div className="size-14 rounded-full bg-primary/10 border-2 border-border/60 flex items-center justify-center text-primary font-bold text-lg mb-1">
            {initials}
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
              placeholder="https://example.com/photo.jpg"
              type="url"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-2 space-y-1.5">
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
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="size-4" />
              )}
              {isUploading ? "Uploading…" : "Choose a photo"}
            </Button>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP · max 4 MB</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Username + Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="username"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
          >
            <AtSignIcon className="size-3" /> Username
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            placeholder="your_username"
            className="h-9 bg-muted/30 border-border/80 text-sm"
            maxLength={30}
          />
          {usernameError ? (
            <p className="text-[10px] text-destructive">{usernameError}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Letters, numbers, _ and - only
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
          >
            <UserIcon className="size-3" /> Display Name
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
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label
          htmlFor="bio"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
        >
          <FileTextIcon className="size-3" /> Bio
          <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
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

      <Button
        type="button"
        className="h-9 font-semibold gap-1.5 shadow-sm"
        onClick={handleSave}
        disabled={isPending || isUploading || !!usernameError || username.length < 3}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Save Profile
      </Button>
    </div>
  )
}
