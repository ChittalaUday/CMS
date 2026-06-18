"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { createApiToken, revokeApiToken } from "@/app/_actions/api-tokens"
import { type ApiCategory } from "@/lib/api-registry"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import Link from "next/link"
import {
  PlusIcon, CopyIcon, CheckIcon, KeyRoundIcon, TrashIcon,
  ClockIcon, AlertTriangleIcon, Loader2Icon, ShieldCheckIcon,
  EyeOffIcon, BookOpenIcon, ArrowRightIcon,
} from "lucide-react"

type Token = {
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

type Props = {
  tokens: Token[]
  registry: ApiCategory[]
  hasClient: boolean
}

function permissionFromId(scopeId: string): "read" | "write" {
  return scopeId.startsWith("write:") ? "write" : "read"
}

function TokenStatusBadge({ token }: { token: Token }) {
  if (token.revokedAt) {
    return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5 text-xs">Revoked</Badge>
  }
  if (token.expiresAt && token.expiresAt < new Date()) {
    return <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-xs">Expired</Badge>
  }
  return <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs">Active</Badge>
}

function ScopeBadge({ scopeId }: { scopeId: string }) {
  const perm = permissionFromId(scopeId)
  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono ${perm === "write"
        ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
        : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
      }`}
    >
      {scopeId}
    </Badge>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-muted transition-colors">
      {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5 text-muted-foreground" />}
    </button>
  )
}

function formatRelative(date: Date | null) {
  if (!date) return "Never"
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

// ── Scope picker — no endpoint disclosure ────────────────────────────────────

function ScopeSelector({
  registry,
  selected,
  onChange,
  disabled,
}: {
  registry: ApiCategory[]
  selected: string[]
  onChange: (s: string[]) => void
  disabled?: boolean
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  return (
    <div className="space-y-3">
      {registry.map((category) => (
        <div key={category.id} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category.label}</p>
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
                      className={`text-xs px-1.5 py-0 ${perm === "write"
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


// ── Create token dialog ──────────────────────────────────────────────────────

function CreateTokenDialog({ registry }: { registry: ApiCategory[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  const { execute, isPending } = useAction(createApiToken, {
    onSuccess: ({ data }) => {
      if (data?.rawKey) setCreatedKey(data.rawKey)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to create token")
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Token name is required"); return }
    if (selectedScopes.length === 0) { toast.error("Select at least one scope"); return }
    execute({
      name: name.trim(),
      scopes: selectedScopes,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    })
  }

  const copyKey = () => {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
    toast.success("Token copied to clipboard")
  }

  const handleClose = () => {
    if (createdKey) window.location.reload()
    setOpen(false)
    setName("")
    setSelectedScopes([])
    setExpiresAt("")
    setCreatedKey(null)
    setKeyCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-4" />
          Create token
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            {createdKey ? "Token created" : "Create API token"}
          </DialogTitle>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangleIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Copy this token now. It will <strong>not be shown again</strong>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Your new API token</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border font-mono text-xs break-all">
                <EyeOffIcon className="size-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{createdKey}</span>
                <button onClick={copyKey} className="shrink-0 p-1 rounded hover:bg-background transition-colors">
                  {keyCopied
                    ? <CheckIcon className="size-3.5 text-emerald-500" />
                    : <CopyIcon className="size-3.5 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="token-name">Token name</Label>
              <Input
                id="token-name"
                placeholder="e.g. Production website"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <ScopeSelector
                registry={registry}
                selected={selectedScopes}
                onChange={setSelectedScopes}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expires-at" className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5 text-muted-foreground" />
                Expiry date
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={isPending}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isPending || !name || selectedScopes.length === 0}>
                {isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
                Create token
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Revoke button ────────────────────────────────────────────────────────────

function RevokeButton({ tokenId, tokenName }: { tokenId: string; tokenName: string }) {
  const { execute, isPending } = useAction(revokeApiToken, {
    onSuccess: () => toast.success(`Token "${tokenName}" revoked`),
    onError: ({ error }) => toast.error(error.serverError ?? "Failed to revoke token"),
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
          {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke token?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>"{tokenName}"</strong> will be permanently revoked. Any integrations using this token will stop working immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => execute({ id: tokenId })}
          >
            Revoke token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Token row ────────────────────────────────────────────────────────────────

function TokenRow({ token, showRevoke = true }: { token: Token; showRevoke?: boolean }) {
  return (
    <div className="px-4 py-3.5 bg-card flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{token.name}</span>
          <TokenStatusBadge token={token} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <span>{token.keyPrefix}</span>
            <CopyButton value={token.keyPrefix} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {token.scopes.map((s) => <ScopeBadge key={s} scopeId={s} />)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Last used: {formatRelative(token.lastUsedAt)}</span>
          {token.expiresAt && (
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              Expires {new Date(token.expiresAt).toLocaleDateString()}
            </span>
          )}
          {token.createdBy && <span>by {token.createdBy.name ?? token.createdBy.username}</span>}
        </div>
      </div>
      {showRevoke && !token.revokedAt && (
        <RevokeButton tokenId={token.id} tokenName={token.name} />
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ApiTokensManager({ tokens, registry, hasClient }: Props) {

  if (!hasClient) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">API Tokens</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage API keys for programmatic access.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl gap-3">
          <ShieldCheckIcon className="size-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-sm">No client associated</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Your account must be associated with a client before you can create API tokens. Contact your Super Admin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const active = tokens.filter((t) => !t.revokedAt && (!t.expiresAt || t.expiresAt > new Date()))
  const inactive = tokens.filter((t) => t.revokedAt || (t.expiresAt && t.expiresAt <= new Date()))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">API Tokens</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tokens grant programmatic access to your public APIs. Keep them secret.
          </p>
        </div>
        <CreateTokenDialog registry={registry} />
      </div>

      {tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl gap-3">
          <KeyRoundIcon className="size-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-sm">No API tokens yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a token to allow external apps to access your APIs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active ({active.length})</p>
              <div className="divide-y divide-border/50 rounded-xl border border-border/60 overflow-hidden">
                {active.map((t) => <TokenRow key={t.id} token={t} />)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactive ({inactive.length})</p>
              <div className="divide-y divide-border/50 rounded-xl border border-border/60 overflow-hidden opacity-60">
                {inactive.map((t) => <TokenRow key={t.id} token={t} showRevoke={false} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Separator />

      <Link
        href="/dashboard/api-docs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpenIcon className="size-4" />
        View API Documentation
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  )
}
