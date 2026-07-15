"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { generateApiKey, revokeApiKey } from "./actions"
import { API_REGISTRY, type ApiCategory } from "@/lib/utils/api-registry"
import { toast } from "sonner"
import { Copy, Check, KeyRound, Plus, Loader2, AlertTriangle, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { copyToClipboard } from "@/lib/utils/utils"

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  createdBy: { name: string | null; username: string } | null
}

function getKeyStatus(key: ApiKey): "active" | "revoked" | "expired" {
  if (key.revokedAt) return "revoked"
  if (key.expiresAt && key.expiresAt < new Date()) return "expired"
  return "active"
}

const STATUS_BADGE = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  revoked: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-muted text-muted-foreground border-border",
}

function formatRelative(date: Date | null) {
  if (!date) return "Never"
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function permissionFromId(scopeId: string): "read" | "write" {
  return scopeId.startsWith("write:") ? "write" : "read"
}

function ScopeSelector({
  registry,
  selected,
  onChange,
  disabled,
}: {
  registry: ApiCategory[]
  selected: string[]
  onChange: (scopes: string[]) => void
  disabled?: boolean
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  return (
    <div className="space-y-3">
      {registry.map((category) => (
        <div key={category.id} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="size-3" />
            {category.label}
          </p>
          {category.scopes.map((scope) => {
            const perm = permissionFromId(scope.id)
            return (
            <label
              key={scope.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selected.includes(scope.id)}
                onCheckedChange={() => toggle(scope.id)}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{scope.label}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 ${
                      perm === "write"
                        ? "border-amber-500/30 text-amber-600 bg-amber-500/5"
                        : "border-blue-500/30 text-blue-600 bg-blue-500/5"
                    }`}
                  >
                    {perm}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{scope.description}</p>
              </div>
            </label>
            )
          })}
        </div>
      ))}
    </div>
  )
}

type Props = {
  clientId: string
  initialKeys: ApiKey[]
}

export function ApiKeyManager({ clientId, initialKeys }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [showGenerate, setShowGenerate] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyExpiry, setNewKeyExpiry] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  function handleGenerate() {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return }
    if (selectedScopes.length === 0) { toast.error("Select at least one scope"); return }
    startTransition(async () => {
      try {
        const result = await generateApiKey(
          clientId,
          newKeyName.trim(),
          selectedScopes,
          newKeyExpiry ? new Date(newKeyExpiry) : undefined
        )
        setGeneratedKey(result.rawKey)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate key")
      }
    })
  }

  function handleCopy() {
    if (!generatedKey) return
    copyToClipboard(generatedKey).then((success) => {
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success("API key copied")
      } else {
        toast.error("Failed to copy API key")
      }
    })
  }

  function closeGenerateDialog() {
    setShowGenerate(false)
    setNewKeyName("")
    setNewKeyExpiry("")
    setSelectedScopes([])
    setGeneratedKey(null)
  }

  function handleRevoke() {
    if (!revokeTarget) return
    startTransition(async () => {
      try {
        await revokeApiKey(revokeTarget.id, clientId)
        toast.success(`"${revokeTarget.name}" revoked`)
        setRevokeTarget(null)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to revoke key")
      }
    })
  }

  const active = initialKeys.filter((k) => getKeyStatus(k) === "active")
  const inactive = initialKeys.filter((k) => getKeyStatus(k) !== "active")

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {active.length} active · {initialKeys.length} total
        </p>
        <Button size="sm" onClick={() => setShowGenerate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Generate Key
        </Button>
      </div>

      {initialKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl">
          <KeyRound className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No API keys</p>
          <p className="text-xs text-muted-foreground mt-1">Generate a key to allow API access.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Prefix</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Scopes</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Last Used</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Expires</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {active.map((key) => (
                    <KeyRow
                      key={key.id}
                      apiKey={key}
                      status="active"
                      onRevoke={() => setRevokeTarget(key)}
                      pending={pending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="rounded-xl border overflow-x-auto opacity-60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Prefix</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Scopes</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Last Used</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Expires</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {inactive.map((key) => (
                    <KeyRow
                      key={key.id}
                      apiKey={key}
                      status={getKeyStatus(key)}
                      pending={pending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate key dialog */}
      <Dialog open={showGenerate} onOpenChange={(open) => !open && closeGenerateDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              {generatedKey ? "Key created" : "Generate API Key"}
            </DialogTitle>
            <DialogDescription>
              {generatedKey
                ? "Copy this key now — it will not be shown again."
                : "Choose a name, permissions, and optional expiry."}
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Store this key securely — it will <strong>not be shown again</strong>.
                </span>
              </div>
              <div className="flex gap-2">
                <Input value={generatedKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeGenerateDialog} className="w-full">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label>Key Name *</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Website"
                  disabled={pending}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions *</Label>
                <ScopeSelector
                  registry={API_REGISTRY}
                  selected={selectedScopes}
                  onChange={setSelectedScopes}
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="date"
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={pending}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeGenerateDialog} disabled={pending}>Cancel</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={pending || !newKeyName.trim() || selectedScopes.length === 0}
                >
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &quot;{revokeTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately invalidate this key. Any service using it will receive 401 errors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function KeyRow({
  apiKey,
  status,
  onRevoke,
  pending,
}: {
  apiKey: ApiKey
  status: "active" | "revoked" | "expired"
  onRevoke?: () => void
  pending?: boolean
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium">{apiKey.name}</div>
        {apiKey.createdBy && (
          <div className="text-xs text-muted-foreground">
            by {apiKey.createdBy.name ?? apiKey.createdBy.username}
          </div>
        )}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-muted-foreground">
        {apiKey.keyPrefix}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {apiKey.scopes.map((s) => (
            <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
        {formatRelative(apiKey.lastUsedAt)}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
        {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : "Never"}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={STATUS_BADGE[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {status === "active" && onRevoke && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive"
            disabled={pending}
            onClick={onRevoke}
          >
            Revoke
          </Button>
        )}
      </td>
    </tr>
  )
}
