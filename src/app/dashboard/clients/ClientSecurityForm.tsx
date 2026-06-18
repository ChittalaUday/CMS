"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Plus } from "lucide-react"
import { upsertClientSecurityConfig } from "./actions"

type SecurityConfig = {
  apiRateLimitRpm: number
  apiRateLimitBurst: number
  maxApiKeys: number
  allowedOrigins: string[]
  allowedIps: string[]
}

type Props = {
  clientId: string
  initial: SecurityConfig | null
}

const DEFAULTS: SecurityConfig = {
  apiRateLimitRpm: 60,
  apiRateLimitBurst: 10,
  maxApiKeys: 10,
  allowedOrigins: [],
  allowedIps: [],
}

export function ClientSecurityForm({ clientId, initial }: Props) {
  const config = initial ?? DEFAULTS
  const [rpm, setRpm] = useState(config.apiRateLimitRpm)
  const [burst, setBurst] = useState(config.apiRateLimitBurst)
  const [maxKeys, setMaxKeys] = useState(config.maxApiKeys)
  const [origins, setOrigins] = useState<string[]>(config.allowedOrigins)
  const [ips, setIps] = useState<string[]>(config.allowedIps)
  const [originInput, setOriginInput] = useState("")
  const [ipInput, setIpInput] = useState("")
  const [isPending, startTransition] = useTransition()

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void
  ) {
    const trimmed = value.trim()
    if (!trimmed || list.includes(trimmed)) return
    setList([...list, trimmed])
    setInput("")
  }

  function removeTag(value: string, list: string[], setList: (v: string[]) => void) {
    setList(list.filter((v) => v !== value))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await upsertClientSecurityConfig(clientId, {
          apiRateLimitRpm: rpm,
          apiRateLimitBurst: burst,
          maxApiKeys: maxKeys,
          allowedOrigins: origins,
          allowedIps: ips,
        })
        toast.success("Security config saved")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rate limiting */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Rate Limiting
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rpm">Requests per minute</Label>
            <Input
              id="rpm"
              type="number"
              min={1}
              max={10000}
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Sustained API request limit (default 60)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="burst">Burst allowance</Label>
            <Input
              id="burst"
              type="number"
              min={1}
              max={1000}
              value={burst}
              onChange={(e) => setBurst(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Extra requests allowed in a short window (default 10)</p>
          </div>
        </div>
      </div>

      {/* API key cap */}
      <div className="space-y-1.5">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          API Keys
        </h4>
        <Label htmlFor="maxKeys">Max active API keys</Label>
        <Input
          id="maxKeys"
          type="number"
          min={1}
          max={100}
          className="max-w-[160px]"
          value={maxKeys}
          onChange={(e) => setMaxKeys(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">Maximum non-revoked, non-expired keys allowed (default 10)</p>
      </div>

      {/* Allowed origins */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          CORS — Allowed Origins
        </h4>
        <p className="text-xs text-muted-foreground">
          Leave empty to allow the client's registered domain only. Add origins like{" "}
          <code className="bg-muted px-1 rounded text-xs">https://app.example.com</code> to permit additional ones.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com"
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTag(originInput, origins, setOrigins, setOriginInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addTag(originInput, origins, setOrigins, setOriginInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {origins.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {origins.map((o) => (
              <Badge key={o} variant="secondary" className="gap-1 pr-1">
                <span className="font-mono text-xs">{o}</span>
                <button
                  type="button"
                  onClick={() => removeTag(o, origins, setOrigins)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* IP allowlist */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          IP Allowlist
        </h4>
        <p className="text-xs text-muted-foreground">
          Leave empty to allow all IPs. Add IPs or CIDR ranges like{" "}
          <code className="bg-muted px-1 rounded text-xs">203.0.113.0/24</code> to restrict access.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="192.168.1.1 or 10.0.0.0/8"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTag(ipInput, ips, setIps, setIpInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addTag(ipInput, ips, setIps, setIpInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {ips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ips.map((ip) => (
              <Badge key={ip} variant="secondary" className="gap-1 pr-1">
                <span className="font-mono text-xs">{ip}</span>
                <button
                  type="button"
                  onClick={() => removeTag(ip, ips, setIps)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Security Config
      </Button>
    </form>
  )
}
