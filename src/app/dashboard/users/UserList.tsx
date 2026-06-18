"use client"

import { useState, useTransition, useEffect } from "react"
import { createEditor, updateEditor, deleteEditor } from "@/app/_actions/users"
import { regenerateInvite } from "@/app/_actions/invites"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Temporal } from "@js-temporal/polyfill"
import {
  SearchIcon, UserPlusIcon, Edit3Icon, Trash2Icon, XIcon,
  CopyIcon, LinkIcon, KeyRoundIcon, RefreshCwIcon, CheckIcon,
  ClockIcon, MailIcon, Loader2Icon,
} from "lucide-react"
import { Role } from "@/lib/roles"
import PasswordIndicator from "@/components/PasswordIndicator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useDebounce } from "@/hooks/use-debounce"
import { BlogsPagination } from "@/app/dashboard/blogs/BlogsPagination"

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  [Role.SUPER_ADMIN]: { label: "Super Admin", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  [Role.ADMIN]: { label: "Admin", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  [Role.HR]: { label: "HR", className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  [Role.EDITOR]: { label: "Editor", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  [Role.DEVELOPER]: { label: "Developer", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
}

type InviteInfo = { token: string; code: string; expiresAt: Date }

type EditorUser = {
  id: string
  email: string
  username: string
  name: string | null
  role: Role
  onboardingCompleted: boolean
  createdAt: Date
  invite: { token: string; code: string; expiresAt: Date; usedAt: Date | null } | null
}

type UserStatus = "active" | "invite-pending" | "invite-expired" | "setup-pending"

function getUserStatus(user: EditorUser): UserStatus {
  if (user.onboardingCompleted) return "active"
  if (!user.invite) return "active"
  if (user.invite.usedAt) return "setup-pending"
  if (new Date(user.invite.expiresAt) < new Date()) return "invite-expired"
  return "invite-pending"
}

const STATUS_CONFIG: Record<UserStatus, { label: string; className: string; Icon: typeof ClockIcon }> = {
  "active": { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", Icon: CheckIcon },
  "invite-pending": { label: "Invite Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", Icon: MailIcon },
  "invite-expired": { label: "Invite Expired", className: "bg-destructive/10 text-destructive border-destructive/20", Icon: ClockIcon },
  "setup-pending": { label: "Setup Pending", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", Icon: Loader2Icon },
}

// ── Form schemas ─────────────────────────────────────────────────────────────

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Only letters, numbers, underscores, and hyphens — no spaces"
  )

const createSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  username: usernameSchema,
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "HR", "EDITOR"]),
})

const editSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  username: usernameSchema,
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "HR", "EDITOR"]),
  password: z.string().min(8).optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
})

// ── Invite Dialog ─────────────────────────────────────────────────────────────

function InviteDialog({
  info,
  userName,
  onClose,
}: {
  info: InviteInfo
  userName: string
  onClose: () => void
}) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const inviteLink = `${origin}/invite/${info.token}`
  const formattedCode = info.code.slice(0, 4) + "-" + info.code.slice(4)

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MailIcon className="size-5 text-primary" />
            Invite Generated
          </h3>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            Share either the link or access code with{" "}
            <span className="font-semibold text-foreground">{userName}</span>. The invite expires in 7 days.
          </p>

          {/* Invite link */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="size-3" /> Invite Link
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/60">
              <code className="flex-1 text-xs font-mono text-foreground truncate">{inviteLink}</code>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 rounded-md hover:bg-muted"
                onClick={() => copy(inviteLink, setCopiedLink)}
                title="Copy link"
              >
                {copiedLink ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          {/* Access code */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <KeyRoundIcon className="size-3" /> Access Code
            </p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="flex-1 text-2xl font-mono font-bold tracking-[0.3em] text-foreground">
                {formattedCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 rounded-md hover:bg-muted"
                onClick={() => copy(formattedCode, setCopiedCode)}
                title="Copy code"
              >
                {copiedCode ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              User can enter this at{" "}
              <span className="font-mono">{origin}/invite</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs">
            <ClockIcon className="size-3.5 shrink-0" />
            Expires{" "}
            {new Date(info.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>

          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface UserListProps {
  initialEditors: EditorUser[]
  totalCount: number
  totalPages: number
  currentPage: number
  currentSearch: string
  currentRole: string
  currentUserRole: Role
}

export function UserList({ initialEditors, totalCount, totalPages, currentPage, currentSearch, currentRole, currentUserRole }: UserListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch)
  const debouncedSearch = useDebounce(search, 400)
  const [role, setRole] = useState(currentRole)
  const [isPending, startTransition] = useTransition()

  const [modalMode, setModalMode] = useState<"create" | "edit" | "delete" | null>(null)
  const [selectedEditor, setSelectedEditor] = useState<EditorUser | null>(null)
  const [isPasswordValid, setIsPasswordValid] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{ info: InviteInfo; userName: string } | null>(null)

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", username: "", email: "", role: "ADMIN" },
  })

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", username: "", email: "", role: "EDITOR", password: "", confirmPassword: "" },
  })

  const editPasswordValue = editForm.watch("password") || ""
  const editConfirmValue = editForm.watch("confirmPassword") || ""

  const filteredEditors = initialEditors

  // Sync state when URL params change (e.g. back navigation)
  useEffect(() => {
    setSearch(currentSearch)
  }, [currentSearch])

  useEffect(() => {
    setRole(currentRole)
  }, [currentRole])

  // Update URL search params when filter/search state changes
  useEffect(() => {
    if (debouncedSearch === currentSearch && role === currentRole) {
      return
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (debouncedSearch) {
      params.set("search", debouncedSearch)
    } else {
      params.delete("search")
    }

    if (role && role !== "all") {
      params.set("role", role)
    } else {
      params.delete("role")
    }

    // Reset page to 1 when filters change
    params.delete("page")

    const query = params.toString()
    const targetUrl = query ? `${pathname}?${query}` : pathname

    startTransition(() => {
      router.push(targetUrl)
    })
  }, [debouncedSearch, role, pathname, searchParams, router, currentSearch, currentRole])

  function openCreateModal() {
    createForm.reset({ name: "", username: "", email: "", role: "ADMIN" })
    setModalMode("create")
  }

  useEffect(() => {
    if (searchParams?.get("invite") === "true") {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("invite")
      const query = params.toString()
      const cleanUrl = query ? `${pathname}?${query}` : pathname
      router.replace(cleanUrl)
      openCreateModal()
    }
  }, [searchParams, pathname, router])

  function openEditModal(editor: EditorUser) {
    editForm.reset({
      name: editor.name || "",
      username: editor.username,
      email: editor.email,
      role: ([Role.ADMIN, Role.HR, Role.EDITOR] as Role[]).includes(editor.role)
        ? (editor.role as "ADMIN" | "HR" | "EDITOR")
        : "EDITOR",
      password: "",
      confirmPassword: "",
    })
    setIsPasswordValid(true)
    setSelectedEditor(editor)
    setModalMode("edit")
  }

  function openDeleteModal(editor: EditorUser) {
    setSelectedEditor(editor)
    setModalMode("delete")
  }

  function closeModal() {
    setModalMode(null)
    setSelectedEditor(null)
  }

  const handleCreate = createForm.handleSubmit((data) => {
    startTransition(async () => {
      const toastId = toast.loading("Creating user…")
      try {
        const result = await createEditor({ email: data.email, username: data.username, name: data.name, role: data.role })
        if (result?.serverError || result?.validationErrors) {
          throw new Error(result?.serverError || "Failed to create user")
        }
        const invite = result?.data?.invite
        toast.success("User created!", { id: toastId })
        closeModal()
        if (invite) {
          setInviteInfo({ info: invite, userName: data.name })
        }
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create user"
        toast.error(msg, { id: toastId })
      }
    })
  })

  const handleEdit = editForm.handleSubmit((data) => {
    if (!selectedEditor) return
    if (data.password) {
      if (!isPasswordValid) { toast.error("Password does not meet strength requirements"); return }
      if (data.password !== data.confirmPassword) { toast.error("Passwords do not match"); return }
    }
    startTransition(async () => {
      const toastId = toast.loading("Saving changes…")
      try {
        const result = await updateEditor({
          id: selectedEditor.id,
          name: data.name,
          username: data.username,
          email: data.email,
          password: data.password || undefined,
          role: data.role,
        })
        if (result?.serverError || result?.validationErrors) {
          throw new Error(result?.serverError || "Failed to update user")
        }
        toast.success("User updated!", { id: toastId })
        closeModal()
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update user"
        toast.error(msg, { id: toastId })
      }
    })
  })

  function handleDelete() {
    if (!selectedEditor) return
    startTransition(async () => {
      const toastId = toast.loading("Deleting user…")
      try {
        const result = await deleteEditor({ id: selectedEditor.id })
        if (result?.serverError || result?.validationErrors) {
          throw new Error(result?.serverError || "Failed to delete user")
        }
        toast.success("User deleted.", { id: toastId })
        closeModal()
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete user"
        toast.error(msg, { id: toastId })
      }
    })
  }

  function handleResendInvite(editor: EditorUser) {
    startTransition(async () => {
      const toastId = toast.loading("Regenerating invite…")
      try {
        const result = await regenerateInvite(editor.id)
        toast.success("New invite generated!", { id: toastId })
        setInviteInfo({ info: result, userName: editor.name || editor.email })
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to regenerate invite"
        toast.error(msg, { id: toastId })
      }
    })
  }

  function copyInviteLink(editor: EditorUser) {
    if (!editor.invite) return
    const origin = window.location.origin
    navigator.clipboard.writeText(`${origin}/invite/${editor.invite.token}`)
    toast.success("Invite link copied!")
  }

  return (
    <div className="space-y-4">
      {/* Invite info dialog (appears after user creation or invite regeneration) */}
      {inviteInfo && (
        <InviteDialog
          info={inviteInfo.info}
          userName={inviteInfo.userName}
          onClose={() => setInviteInfo(null)}
        />
      )}

      {/* Search + Add */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto] items-center">
          <div className="relative w-full max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, email or role…"
              className="pl-9 bg-muted/40 border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="role-filter" className="sr-only">Role filter</label>
            <select
              id="role-filter"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="all">All roles</option>
              <option value="EDITOR">Editor</option>
              <option value="HR">HR</option>
              {currentUserRole === Role.SUPER_ADMIN && <option value="ADMIN">Admin</option>}
            </select>
          </div>
        </div>

        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <UserPlusIcon className="size-4" />
          Invite User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {filteredEditors.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium">
                  <th className="p-4">Name</th>
                  <th className="p-4 hidden sm:table-cell">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 hidden md:table-cell">Status</th>
                  <th className="p-4 hidden lg:table-cell">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEditors.map((editor) => {
                  const roleBadge = ROLE_BADGE[editor.role as Role] ?? ROLE_BADGE[Role.EDITOR]
                  const status = getUserStatus(editor)
                  const statusCfg = STATUS_CONFIG[status]
                  const StatusIcon = statusCfg.Icon
                  const canResend = status === "invite-pending" || status === "invite-expired"

                  return (
                    <tr key={editor.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {(editor.name || editor.username).substring(0, 2)}
                          </div>
                          <span className="font-medium">{editor.name || "—"}</span>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{editor.username}</td>

                      {/* Email */}
                      <td className="p-4">{editor.email}</td>

                      {/* Role */}
                      <td className="p-4">
                        <Badge variant="outline" className={roleBadge.className}>
                          {roleBadge.label}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-4 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusCfg.className}`}>
                          <StatusIcon className="size-3" />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="p-4 text-xs text-muted-foreground hidden lg:table-cell">
                        {Temporal.Instant.from(new Date(editor.createdAt).toISOString()).toZonedDateTimeISO("UTC").toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copy / resend invite — sm+ */}
                          <div className="hidden sm:contents">
                            {canResend ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg hover:bg-muted"
                                title="Regenerate invite"
                                onClick={() => handleResendInvite(editor)}
                                disabled={isPending}
                              >
                                <RefreshCwIcon className="size-3.5 text-muted-foreground" />
                              </Button>
                            ) : editor.invite?.usedAt === null && editor.invite ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg hover:bg-muted"
                                title="Copy invite link"
                                onClick={() => copyInviteLink(editor)}
                              >
                                <CopyIcon className="size-3.5 text-muted-foreground" />
                              </Button>
                            ) : null}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted"
                            onClick={() => openEditModal(editor)}
                            title="Edit user"
                          >
                            <Edit3Icon className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-destructive/10"
                            onClick={() => openDeleteModal(editor)}
                            title="Delete user"
                          >
                            <Trash2Icon className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Showing {filteredEditors.length} of {totalCount} users
        </p>
        <div className="flex items-center justify-end">
          <BlogsPagination page={currentPage} totalPages={totalPages} pageSize={15} />
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      {modalMode === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlusIcon className="size-5 text-primary" />
                Invite New User
              </h3>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={closeModal} disabled={isPending}>
                <XIcon className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground pb-1">
                An invite link and access code will be generated after creation. No password required — the user sets it themselves.
              </p>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="c-name">Full Name</FieldLabel>
                  <Input id="c-name" placeholder="Jane Doe" {...createForm.register("name")} disabled={isPending} className="h-9 bg-muted/30 border-border/80 text-sm" />
                  {createForm.formState.errors.name && <FieldError>{createForm.formState.errors.name.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="c-username">Username</FieldLabel>
                  <Input
                    id="c-username"
                    placeholder="jane_doe"
                    {...createForm.register("username")}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\s/g, "")
                      createForm.register("username").onChange(e)
                    }}
                    disabled={isPending}
                    className="h-9 bg-muted/30 border-border/80 text-sm"
                  />
                  {createForm.formState.errors.username && (
                    <FieldError>{createForm.formState.errors.username.message}</FieldError>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Letters, numbers, <code>_</code> and <code>-</code> only. No spaces.
                  </p>
                </Field>

                <Field>
                  <FieldLabel htmlFor="c-email">Email Address</FieldLabel>
                  <Input id="c-email" type="email" placeholder="jane@example.com" {...createForm.register("email")} disabled={isPending} className="h-9 bg-muted/30 border-border/80 text-sm" />
                  {createForm.formState.errors.email && <FieldError>{createForm.formState.errors.email.message}</FieldError>}
                </Field>

                {(currentUserRole === Role.SUPER_ADMIN || currentUserRole === Role.ADMIN) && (
                  <Field>
                    <FieldLabel htmlFor="c-role">Role</FieldLabel>
                    <select
                      id="c-role"
                      {...createForm.register("role")}
                      disabled={isPending}
                      className="h-9 w-full rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="HR">HR</option>
                      {currentUserRole === Role.SUPER_ADMIN && <option value="ADMIN">Admin</option>}
                    </select>
                  </Field>
                )}
              </FieldGroup>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={closeModal} disabled={isPending}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="gap-1.5">
                  {isPending ? <><Loader2Icon className="size-4 animate-spin" /> Creating…</> : <><MailIcon className="size-4" /> Create & Get Invite</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {modalMode === "edit" && selectedEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Edit3Icon className="size-5 text-primary" />
                Edit User
              </h3>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={closeModal} disabled={isPending}>
                <XIcon className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="e-name">Full Name</FieldLabel>
                  <Input id="e-name" placeholder="Jane Doe" {...editForm.register("name")} disabled={isPending} className="h-9 bg-muted/30 border-border/80 text-sm" />
                  {editForm.formState.errors.name && <FieldError>{editForm.formState.errors.name.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="e-username">Username</FieldLabel>
                  <Input
                    id="e-username"
                    placeholder="jane_doe"
                    {...editForm.register("username")}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\s/g, "")
                      editForm.register("username").onChange(e)
                    }}
                    disabled={isPending}
                    className="h-9 bg-muted/30 border-border/80 text-sm"
                  />
                  {editForm.formState.errors.username && (
                    <FieldError>{editForm.formState.errors.username.message}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="e-email">Email Address</FieldLabel>
                  <Input id="e-email" type="email" placeholder="jane@example.com" {...editForm.register("email")} disabled={isPending} className="h-9 bg-muted/30 border-border/80 text-sm" />
                  {editForm.formState.errors.email && <FieldError>{editForm.formState.errors.email.message}</FieldError>}
                </Field>

                {(currentUserRole === Role.SUPER_ADMIN || currentUserRole === Role.ADMIN) && (
                  <Field>
                    <FieldLabel htmlFor="e-role">Role</FieldLabel>
                    <select
                      id="e-role"
                      {...editForm.register("role")}
                      disabled={isPending}
                      className="h-9 w-full rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="HR">HR</option>
                      {currentUserRole === Role.SUPER_ADMIN && <option value="ADMIN">Admin</option>}
                    </select>
                  </Field>
                )}

                {/* Optional password reset */}
                <Field>
                  <FieldLabel htmlFor="e-password">Reset Password <span className="font-normal text-muted-foreground normal-case">(leave blank to keep current)</span></FieldLabel>
                  <Input
                    id="e-password"
                    type="password"
                    placeholder="New password"
                    {...editForm.register("password", {
                      onChange: (e) => { if (!e.target.value) setIsPasswordValid(true) }
                    })}
                    disabled={isPending}
                    className="h-9 bg-muted/30 border-border/80 text-sm"
                  />
                  <PasswordIndicator password={editPasswordValue} setValid={setIsPasswordValid} />
                </Field>

                {editPasswordValue !== "" && (
                  <Field>
                    <FieldLabel htmlFor="e-confirm">Confirm New Password</FieldLabel>
                    <Input
                      id="e-confirm"
                      type="password"
                      placeholder="Re-enter password"
                      {...editForm.register("confirmPassword")}
                      disabled={isPending}
                      className="h-9 bg-muted/30 border-border/80 text-sm"
                    />
                    {editPasswordValue !== "" && editConfirmValue !== "" && editPasswordValue !== editConfirmValue && (
                      <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                    )}
                  </Field>
                )}
              </FieldGroup>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={closeModal} disabled={isPending}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {modalMode === "delete" && selectedEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trash2Icon className="size-5 text-destructive" />
                Delete User
              </h3>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={closeModal} disabled={isPending}>
                <XIcon className="size-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">{selectedEditor.name || selectedEditor.email}</span>?
                This is permanent and cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={closeModal} disabled={isPending}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                  {isPending ? "Deleting…" : "Delete Account"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
