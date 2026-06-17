"use client"

import { useState, useTransition, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useAction } from "next-safe-action/hooks"
import { updateProfile, updatePassword } from "@/app/_actions/settings"
import { logoutAction } from "@/app/_actions/auth"
import { useUploadThing } from "@/lib/uploadthing-react"
import { useTheme } from "next-themes"
import type { Role } from "@/generated/prisma/enums"
import {
  Loader2,
  UserIcon,
  LinkIcon,
  FileTextIcon,
  KeyRoundIcon,
  UploadIcon,
  AtSignIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon,
  MonitorIcon,
  SunIcon,
  MoonIcon,
  PaletteIcon,
  ShieldIcon,
} from "lucide-react"

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HR: "HR",
  EDITOR: "Editor",
}

const ROLE_CLASS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  ADMIN: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  HR: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  EDITOR: "bg-blue-500/10 text-blue-500 border-blue-500/20",
}

interface SettingsClientProps {
  initialUsername: string
  initialName: string
  initialBio: string
  initialAvatarUrl: string
  email: string
  role: Role
}

export function SettingsClient({
  initialUsername,
  initialName,
  initialBio,
  initialAvatarUrl,
  email,
  role,
}: SettingsClientProps) {
  const { theme, setTheme } = useTheme()

  // ── Profile state ──
  const [username, setUsername] = useState(initialUsername)
  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarMode, setAvatarMode] = useState<"url" | "upload">("url")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // ── Password state ──
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [profilePending, startProfileTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [logoutPending, startLogoutTransition] = useTransition()

  // ── Upload ──
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

  // ── Actions ──
  const { execute: execProfile } = useAction(updateProfile, {
    onSuccess: () => toast.success("Profile saved"),
    onError: ({ error }) => toast.error(error.serverError ?? "Failed to save profile"),
  })

  const { execute: execPassword } = useAction(updatePassword, {
    onSuccess: () => {
      toast.success("Password updated")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Failed to update password"),
  })

  const usernameError =
    username.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(username)
      ? "Only letters, numbers, _ and - allowed"
      : null

  function handleSaveProfile() {
    startProfileTransition(() => {
      execProfile({ username, name, bio, avatarUrl })
    })
  }

  function handleSavePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    startPasswordTransition(() => {
      execPassword({ newPassword, confirmPassword })
    })
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await logoutAction()
      window.location.href = "/"
    })
  }

  // ── Derived display values ──
  const displayName = name || username
  const initials = displayName.slice(0, 2).toUpperCase()
  const roleLabel = ROLE_LABEL[role] ?? role
  const roleClass = ROLE_CLASS[role] ?? ROLE_CLASS.EDITOR

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════════════════════
          PROFILE CARD
      ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5 flex items-center gap-5 shadow-sm">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-16 rounded-full object-cover border-2 border-border/60 shadow"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <div className="size-16 rounded-full bg-primary/10 border-2 border-border/60 flex items-center justify-center text-primary font-bold text-lg">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-base leading-snug truncate">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">@{username}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>

        {/* Role badge */}
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${roleClass}`}
        >
          <ShieldIcon className="size-2.5" />
          {roleLabel}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — PERSONAL INFO
      ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserIcon className="size-4 text-muted-foreground" />
            Personal Info
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visible to other team members.
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
                alt="Avatar"
                className="size-12 rounded-full object-cover border border-border/60 shadow-sm"
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
              <p className="text-[10px] text-muted-foreground">
                JPG, PNG, WebP · max 4 MB
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Username + Name side by side on sm+ */}
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
          onClick={handleSaveProfile}
          disabled={profilePending || isUploading || !!usernameError || username.length < 3}
        >
          {profilePending && <Loader2 className="size-4 animate-spin" />}
          Save Profile
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — APPLICATION SETTINGS
      ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <PaletteIcon className="size-4 text-muted-foreground" />
            Application Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customise how the dashboard looks for you.
          </p>
        </div>
        <Separator className="border-border/40" />

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Theme
          </Label>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {(
              [
                { value: "system", label: "System", Icon: MonitorIcon },
                { value: "light", label: "Light", Icon: SunIcon },
                { value: "dark", label: "Dark", Icon: MoonIcon },
              ] as const
            ).map(({ value, label, Icon }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-xs font-medium transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border/60 text-muted-foreground"
                    }`}
                >
                  <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — ACCOUNT
      ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            Account
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your password and session.
          </p>
        </div>
        <Separator className="border-border/40" />

        {/* Change password */}
        <div className="space-y-4 max-w-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Change Password
          </p>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-xs text-muted-foreground">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-9 bg-muted/30 border-border/80 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNew ? "Hide" : "Show"}
              >
                {showNew ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="h-9 bg-muted/30 border-border/80 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? "Hide" : "Show"}
              >
                {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-destructive">Passwords do not match</p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 font-semibold gap-1.5 border-border/60"
            onClick={handleSavePassword}
            disabled={passwordPending || newPassword.length < 8 || newPassword !== confirmPassword}
          >
            {passwordPending && <Loader2 className="size-4 animate-spin" />}
            Update Password
          </Button>
        </div>

        {/* Logout */}
        <Separator className="border-border/40 max-w-sm" />

        <div className="max-w-sm space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Session
          </p>
          <p className="text-xs text-muted-foreground">
            This will end your current session on this device.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-9 gap-2 font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60"
            onClick={handleLogout}
            disabled={logoutPending}
          >
            {logoutPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOutIcon className="size-4" />
            )}
            {logoutPending ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </div>
    </div>
  )
}
