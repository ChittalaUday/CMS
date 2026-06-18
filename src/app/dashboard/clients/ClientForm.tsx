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
  domain: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  })

  const nameValue = watch("name")

  function onNameBlur() {
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
        toast.error(result.serverError)
        return
      }
      if (result?.validationErrors) {
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
        <p className="text-xs text-muted-foreground">Used for CORS on public API routes.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} rows={3} placeholder="Optional description" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input id="logoUrl" {...register("logoUrl")} placeholder="https://..." />
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
