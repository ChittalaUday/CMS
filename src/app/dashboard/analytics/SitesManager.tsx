"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { Check, Copy, Globe, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { AnalyticsSite } from "@/lib/analytics/schema"
import { addSiteAction, removeSiteAction } from "./actions"

interface Props {
  sites: AnalyticsSite[]
  trackerUrl: string
  canManage: boolean
}

const snippet = (trackerUrl: string, id: string) =>
  `<script defer src="${trackerUrl}/script.js" data-website-id="${id}"></script>`

export function SitesManager({ sites, trackerUrl, canManage }: Props) {
  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<AnalyticsSite | null>(null)

  type FieldErrors = { _errors?: string[] }
  const onAddError = ({ error }: { error: { serverError?: string; validationErrors?: { name?: FieldErrors; domain?: FieldErrors } } }) =>
    toast.error(
      error.serverError ??
        error.validationErrors?.domain?._errors?.[0] ??
        error.validationErrors?.name?._errors?.[0] ??
        "Something went wrong"
    )
  const onRemoveError = ({ error }: { error: { serverError?: string } }) => toast.error(error.serverError ?? "Something went wrong")

  const add = useAction(addSiteAction, {
    onSuccess: () => {
      toast.success("Site added. Paste the tracking snippet into its <head>.")
      setName("")
      setDomain("")
    },
    onError: onAddError,
  })
  const remove = useAction(removeSiteAction, {
    onSuccess: () => {
      toast.success("Site removed from this client")
      setToRemove(null)
    },
    onError: onRemoveError,
  })

  const copy = async (site: AnalyticsSite) => {
    try {
      await navigator.clipboard.writeText(snippet(trackerUrl, site.websiteId))
      setCopied(site.websiteId)
      setTimeout(() => setCopied((c) => (c === site.websiteId ? null : c)), 2000)
    } catch {
      toast.error("Couldn't copy. Select the snippet and copy it manually.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tracked sites</CardTitle>
        <CardDescription>Each site gets a snippet. Add it once to the site&apos;s layout and visits show up here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!trackerUrl && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            <code className="font-mono">UMAMI_PUBLIC_URL</code> isn&apos;t set on the server, so tracking snippets can&apos;t be generated yet.
          </p>
        )}
        {sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sites yet.</p>
        ) : (
          <ul className="space-y-3">
            {sites.map((site) => (
              <li key={site.websiteId} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{site.name}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">{site.domain}</span>
                  </div>
                  {canManage && (
                    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-destructive hover:text-destructive" aria-label={`Remove ${site.name}`} onClick={() => setToRemove(site)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                {trackerUrl && <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
                    {snippet(trackerUrl, site.websiteId)}
                  </code>
                  <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" aria-label={`Copy snippet for ${site.name}`} onClick={() => copy(site)}>
                    {copied === site.websiteId ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <form
            className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              add.execute({ name, domain })
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="site-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input id="site-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zenith Filings" maxLength={80} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-domain" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domain</Label>
              <Input id="site-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="zenithfilings.com" className="h-9" />
            </div>
            <Button type="submit" className="h-9 gap-1.5" disabled={add.isPending || !name.trim() || !domain.trim()}>
              {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add site
            </Button>
          </form>
        )}
      </CardContent>

      <AlertDialog open={!!toRemove} onOpenChange={(open) => !open && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this site?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toRemove?.name}&rdquo; will disappear from this client&apos;s analytics. Its tracked data stays in Umami, and
              the snippet keeps working until you remove it from the site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (toRemove) remove.execute({ websiteId: toRemove.websiteId })
              }}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
