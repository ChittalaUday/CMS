"use client"

import { useState } from "react"
import { type ApiCategory, type ApiEndpoint } from "@/lib/utils/api-registry"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { copyToClipboard } from "@/lib/utils/utils"
import {
  ChevronDownIcon, ChevronRightIcon, CopyIcon, CheckIcon,
  KeyRoundIcon, ShieldIcon, BookOpenIcon, CodeIcon,
} from "lucide-react"

function permissionFromId(id: string): "read" | "write" {
  return id.startsWith("write:") ? "write" : "read"
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    GET:    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    POST:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    PUT:    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    PATCH:  "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    DELETE: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return (
    <Badge variant="outline" className={`font-mono font-bold text-xs px-2 py-0.5 ${styles[method] ?? ""}`}>
      {method}
    </Badge>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    copyToClipboard(text).then((success) => {
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success("Copied to clipboard")
      } else {
        toast.error("Failed to copy")
      }
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
    </button>
  )
}

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border/60">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border/40">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="px-4 py-3 text-[12px] leading-relaxed overflow-x-auto bg-muted/20 text-foreground/90 font-mono">
        {code}
      </pre>
    </div>
  )
}

function EndpointBlock({ ep }: { ep: ApiEndpoint }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors text-left"
      >
        <MethodBadge method={ep.method} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{ep.summary}</p>
        </div>
        {open
          ? <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
          : <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
        }
      </button>

      {open && (
        <div className="px-4 pb-5 space-y-5 border-t border-border/40 pt-4">

          {/* Authentication */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRoundIcon className="size-3" /> Authentication
            </p>
            <p className="text-xs text-muted-foreground">
              Pass your API token in the request header. All public API requests require authentication.
            </p>
            <CodeBlock language="http" code={`X-API-Key: your_token_here\n\n# or via Authorization header:\nAuthorization: Bearer your_token_here`} />
          </div>

          {/* Query params */}
          {ep.queryParams && ep.queryParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Query Parameters</p>
              <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40">
                <div className="grid grid-cols-[120px_80px_80px_1fr] px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Name</span><span>Type</span><span>Required</span><span>Description</span>
                </div>
                {ep.queryParams.map((p) => (
                  <div key={p.name} className="grid grid-cols-[120px_80px_80px_1fr] px-3 py-2.5 text-xs items-start">
                    <code className="font-mono text-foreground">{p.name}</code>
                    <span className="text-muted-foreground">{p.type}</span>
                    <span>{p.required
                      ? <Badge variant="outline" className="text-xs px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/5">yes</Badge>
                      : <span className="text-muted-foreground/60">no</span>
                    }</span>
                    <span className="text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body params */}
          {ep.bodyParams && ep.bodyParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Body</p>
              <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40">
                <div className="grid grid-cols-[140px_1fr_80px_1fr] px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Field</span><span>Type</span><span>Required</span><span>Description</span>
                </div>
                {ep.bodyParams.map((p) => (
                  <div key={p.name} className="grid grid-cols-[140px_1fr_80px_1fr] px-3 py-2.5 text-xs items-start gap-2">
                    <code className="font-mono text-foreground">{p.name}</code>
                    <span className="text-muted-foreground font-mono text-[11px]">{p.type}</span>
                    <span>{p.required
                      ? <Badge variant="outline" className="text-xs px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/5">yes</Badge>
                      : <span className="text-muted-foreground/60">no</span>
                    }</span>
                    <span className="text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request example */}
          {ep.requestExample && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Request</p>
              <CodeBlock code={JSON.stringify(ep.requestExample, null, 2)} />
            </div>
          )}

          {/* Response example */}
          {ep.responseExample && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Response</p>
              <CodeBlock code={JSON.stringify(ep.responseExample, null, 2)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScopeSection({ scope }: { scope: ApiCategory["scopes"][number] }) {
  const perm = permissionFromId(scope.id)

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono font-semibold text-foreground">{scope.id}</code>
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 ${perm === "write"
                ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
              }`}
            >
              {perm}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{scope.description}</p>
        </div>
      </div>

      {scope.endpoints.length > 0 ? (
        <div className="space-y-2">
          {scope.endpoints.map((ep) => (
            <EndpointBlock key={`${ep.method}-${ep.path}`} ep={ep} />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
          <CodeIcon className="size-4 shrink-0" />
          No endpoints available yet — coming soon.
        </div>
      )}
    </div>
  )
}

export function ApiDocsPage({ registry }: { registry: ApiCategory[] }) {
  return (
    <div className="max-w-3xl space-y-8 py-2">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Reference for all public API endpoints. Use these APIs to integrate your website or application
          with your CMS content. All requests require a valid API token.
        </p>
      </div>

      {/* Authentication overview */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="px-5 py-3.5 bg-muted/40 border-b border-border/40 flex items-center gap-2">
          <ShieldIcon className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Authentication</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Every API request must include a valid API token. Tokens are scoped — a token only grants
            access to the permissions it was created with.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Via header</p>
              <CodeBlock language="http" code="X-API-Key: cms_your_token_here" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Via Authorization</p>
              <CodeBlock language="http" code="Authorization: Bearer cms_your_token_here" />
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border/50 px-4 py-3 space-y-1.5 text-xs text-muted-foreground">
            <p><span className="font-semibold text-foreground">401 Unauthorized</span> — missing or invalid token</p>
            <p><span className="font-semibold text-foreground">403 Forbidden</span> — token exists but lacks the required scope for this endpoint</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Getting a token</p>
            <p className="text-xs text-muted-foreground">
              Admins can create tokens in <strong>Settings → API Tokens</strong>. Super Admins manage tokens
              per-client under <strong>Clients → [Client Name] → API Keys</strong>.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Per-category docs */}
      {registry.map((category, i) => (
        <div key={category.id} className="space-y-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{category.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{category.description}</p>
          </div>

          <div className="space-y-8">
            {category.scopes.map((scope) => (
              <ScopeSection key={scope.id} scope={scope} />
            ))}
          </div>

          {i < registry.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  )
}
