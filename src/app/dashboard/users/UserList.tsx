"use client"

import { useState, useTransition } from "react"
import { createEditor, updateEditor, deleteEditor } from "@/app/_actions/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Temporal } from "@js-temporal/polyfill"
import { SearchIcon, UserPlusIcon, Edit3Icon, Trash2Icon, XIcon } from "lucide-react"
import PasswordIndicator from "@/components/PasswordIndicator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

type EditorUser = {
  id: string
  email: string
  username: string
  name: string | null
  role: string
  createdAt: Date
}

const userFormSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "EDITOR"]),
})

interface UserListProps {
  initialEditors: EditorUser[]
  currentUserRole: "SUPER_ADMIN" | "ADMIN" | "EDITOR"
}

export function UserList({ initialEditors, currentUserRole }: UserListProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "delete">("create")
  const [selectedEditor, setSelectedEditor] = useState<EditorUser | null>(null)

  const [isPasswordValid, setIsPasswordValid] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "EDITOR",
    }
  })

  const passwordValue = watch("password") || ""
  const confirmPasswordValue = watch("confirmPassword") || ""

  // Filtered list
  const filteredEditors = initialEditors.filter(
    (editor) =>
      editor.email.toLowerCase().includes(search.toLowerCase()) ||
      editor.username.toLowerCase().includes(search.toLowerCase()) ||
      editor.role.toLowerCase().includes(search.toLowerCase()) ||
      (editor.name && editor.name.toLowerCase().includes(search.toLowerCase()))
  )

  const openCreateModal = () => {
    reset({
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "EDITOR",
    })
    setIsPasswordValid(false)
    setModalMode("create")
    setSelectedEditor(null)
    setIsModalOpen(true)
  }

  const openEditModal = (editor: EditorUser) => {
    reset({
      name: editor.name || "",
      username: editor.username,
      email: editor.email,
      password: "",
      confirmPassword: "",
      role: (editor.role as "ADMIN" | "EDITOR") || "EDITOR",
    })
    setIsPasswordValid(true) // Start as true since it's empty
    setSelectedEditor(editor)
    setModalMode("edit")
    setIsModalOpen(true)
  }

  const openDeleteModal = (editor: EditorUser) => {
    setSelectedEditor(editor)
    setModalMode("delete")
    setIsModalOpen(true)
  }

  const handleFormSubmit = (data: z.infer<typeof userFormSchema>) => {
    if (modalMode === "create") {
      if (!data.password) {
        toast.error("Password is required")
        return
      }
      if (!isPasswordValid) {
        toast.error("Password does not meet strength requirements")
        return
      }
      if (data.password !== data.confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
      startTransition(async () => {
        const toastId = toast.loading("Creating user...")
        try {
          const result = await createEditor({
            email: data.email,
            username: data.username,
            name: data.name,
            password: data.password!,
            role: data.role,
          })
          if (result?.serverError || result?.validationErrors) {
            throw new Error(result?.serverError || "Failed to create user")
          }
          toast.success("User created successfully!", { id: toastId })
          setIsModalOpen(false)
          router.refresh()
        } catch (err: any) {
          toast.error(err.message || "Failed to create user", { id: toastId })
        }
      })
    } else if (modalMode === "edit" && selectedEditor) {
      if (data.password) {
        if (!isPasswordValid) {
          toast.error("Password does not meet strength requirements")
          return
        }
        if (data.password !== data.confirmPassword) {
          toast.error("Passwords do not match")
          return
        }
      }
      startTransition(async () => {
        const toastId = toast.loading("Updating user...")
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
          toast.success("User updated successfully!", { id: toastId })
          setIsModalOpen(false)
          router.refresh()
        } catch (err: any) {
          toast.error(err.message || "Failed to update user", { id: toastId })
        }
      })
    }
  }

  const handleDelete = () => {
    if (!selectedEditor) return
    startTransition(async () => {
      const toastId = toast.loading("Deleting user...")
      try {
        const result = await deleteEditor({ id: selectedEditor.id })
        if (result?.serverError || result?.validationErrors) {
          throw new Error(result?.serverError || "Failed to delete user")
        }
        toast.success("User deleted successfully!", { id: toastId })
        setIsModalOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user", { id: toastId })
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, username, email, or role..."
            className="pl-9 bg-muted/40 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <UserPlusIcon className="size-4" />
          Add User
        </Button>
      </div>

      {/* User Table / List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {filteredEditors.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No users found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium">
                  <th className="p-4">Name</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEditors.map((editor) => (
                  <tr key={editor.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {(editor.name || editor.username).substring(0, 2)}
                      </div>
                      <span>{editor.name || "N/A"}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{editor.username}</td>
                    <td className="p-4">{editor.email}</td>
                    <td className="p-4">
                      {editor.role === "ADMIN" ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-blue-500/20">
                          Editor
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {Temporal.Instant.from(new Date(editor.createdAt).toISOString()).toZonedDateTimeISO("UTC").toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditModal(editor)}
                        >
                          <Edit3Icon className="size-4 text-muted-foreground hover:text-foreground" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:bg-destructive/10"
                          onClick={() => openDeleteModal(editor)}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog (Vanilla React implementation overlay) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {modalMode === "create" && (
                  <>
                    <UserPlusIcon className="size-5 text-primary" />
                    Create New User
                  </>
                )}
                {modalMode === "edit" && (
                  <>
                    <Edit3Icon className="size-5 text-primary" />
                    Update User Info
                  </>
                )}
                {modalMode === "delete" && (
                  <>
                    <Trash2Icon className="size-5 text-destructive" />
                    Delete User Account
                  </>
                )}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            {/* Modal Body */}
            {modalMode === "delete" ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{selectedEditor?.name || selectedEditor?.email}</span>? This action is permanent and cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    {isPending ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input
                      id="name"
                      placeholder="Jane Doe"
                      {...register("name")}
                      disabled={isPending}
                    />
                    {errors.name && <FieldError>{errors.name.message}</FieldError>}
                  </Field>
                  
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      id="username"
                      placeholder="janedoe"
                      {...register("username")}
                      disabled={isPending}
                    />
                    {errors.username && <FieldError>{errors.username.message}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@cms.local"
                      {...register("email")}
                      disabled={isPending}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                  </Field>

                  {currentUserRole === "SUPER_ADMIN" && (
                    <Field>
                      <FieldLabel htmlFor="role">Role</FieldLabel>
                      <select
                        id="role"
                        {...register("role")}
                        disabled={isPending}
                        className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {errors.role && <FieldError>{errors.role.message}</FieldError>}
                    </Field>
                  )}

                  <Field>
                    <FieldLabel htmlFor="password">
                      {modalMode === "edit" ? "New Password (Leave blank to keep current)" : "Password"}
                    </FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder={modalMode === "edit" ? "••••••••" : "At least 6 characters"}
                      {...register("password", {
                        onChange: (e) => {
                          const val = e.target.value;
                          if (modalMode === "edit" && val === "") {
                            setIsPasswordValid(true);
                          }
                        }
                      })}
                      disabled={isPending}
                    />
                    {errors.password && <FieldError>{errors.password.message}</FieldError>}
                    <PasswordIndicator password={passwordValue} setValid={setIsPasswordValid} />
                  </Field>

                  {(modalMode === "create" || passwordValue !== "") && (
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        {...register("confirmPassword")}
                        disabled={isPending}
                      />
                      {errors.confirmPassword && <FieldError>{errors.confirmPassword.message}</FieldError>}
                      {passwordValue !== "" && confirmPasswordValue !== "" && passwordValue !== confirmPasswordValue && (
                        <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                      )}
                    </Field>
                  )}
                </FieldGroup>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                  >
                    {isPending
                      ? modalMode === "create"
                        ? "Creating..."
                        : "Saving..."
                      : modalMode === "create"
                      ? "Create Account"
                      : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
