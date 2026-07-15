"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useTransition } from "react"
import { createClient, updateClient } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  domain: z.string()
    .transform(v => v === "" ? undefined : v)
    .optional()
    .refine(
      val => !val || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i.test(val),
      "Invalid domain format (e.g., example.com)"
    ),
  description: z.string().optional(),
  logoUrl: z.string()
    .transform(v => v === "" ? undefined : v)
    .optional()
    .refine(
      val => !val || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(val),
      "Invalid URL format"
    ),
})

type FormValues = z.infer<typeof schema>

type Props = {
  clientId?: string
  defaultValues?: Partial<FormValues>
  onSuccess?: () => void
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
}

export function ClientForm({ clientId, defaultValues, onSuccess }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  })

  const nameValue = watch("name")

  function onNameBlur() {
    // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is inherently unmemoizable; avoiding it here would require a broader form refactor
    if (!clientId && nameValue && !watch("slug")) {
      setValue("slug", toSlug(nameValue))
    }
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = clientId
        ? await updateClient({ id: clientId, ...data })
        : await createClient(data)

      if (result?.serverError) {
        if (result.serverError.toLowerCase().includes("slug")) {
          setError("slug", { type: "server", message: result.serverError })
        } else {
          toast.error(result.serverError)
        }
        return
      }

      if (result?.validationErrors) {
        Object.entries(result.validationErrors).forEach(([key, value]) => {
          const fieldKey = key as keyof FormValues
          if (Array.isArray(value)) {
            setError(fieldKey, { type: "server", message: value.join(", ") })
          } else if (value && typeof value === "object" && "_errors" in value && Array.isArray(value._errors)) {
            setError(fieldKey, { type: "server", message: value._errors.join(", ") })
          }
        })
        toast.error("Please fix the form errors.")
        return
      }

      toast.success(clientId ? "Client updated." : "Client created.")
      if (onSuccess) onSuccess()
      else {
        if (!clientId) {
          router.push("/dashboard/users?invite=true")
        } else {
          router.push("/dashboard/clients")
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register("name")} onBlur={onNameBlur} placeholder="Acme Corp" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug *</Label>
        <Input id="slug" {...register("slug")} placeholder="acme-corp" className="font-mono text-sm" />
        {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
        <p className="text-xs text-muted-foreground">Used in URLs and API references. Cannot be changed later.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="domain">Domain</Label>
        <Input id="domain" {...register("domain")} placeholder="acme.com" />
        {errors.domain && <p className="text-sm text-destructive">{errors.domain.message}</p>}
        <p className="text-xs text-muted-foreground">Used for CORS on public API routes.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} rows={3} placeholder="Optional description" />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input id="logoUrl" {...register("logoUrl")} placeholder="https://..." />
        {errors.logoUrl && <p className="text-sm text-destructive">{errors.logoUrl.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {clientId ? "Save Changes" : "Create Client"}
        </Button>
        <Button type="button" variant="outline" onClick={() => onSuccess ? onSuccess() : router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
