"use client"

import { useEffect, useState } from "react"
import { getQueueStatus, triggerQueueWorker, resetFailedQueueItems } from "../actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, 
  RefreshCw, 
  Play, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Hourglass, 
  Activity,
  ArrowLeft,
  Briefcase,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type QueueData = Awaited<ReturnType<typeof getQueueStatus>>
type AtsQueueItem = QueueData["ats"]["items"][number]
type KeywordQueueItem = QueueData["keyword"]["items"][number]

export default function QueueMonitorPage() {
  const [data, setData] = useState<QueueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState<"ats" | "keyword">("ats")

  async function fetchStatus(showLoading = false) {
    if (showLoading) setLoading(true)
    try {
      const res = await getQueueStatus()
      setData(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch queue status")
    } finally {
      setLoading(false)
    }
  }

  // Event Source Live Stream Connection with Polling Fallback
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout
    let fallbackPollInterval: NodeJS.Timeout

    function connect() {
      console.log("[SSE] Connecting to real-time events stream...")
      
      // Clear any active polling interval before connecting
      clearInterval(fallbackPollInterval)
      
      eventSource = new EventSource("/api/queue/stream")

      eventSource.onopen = () => {
        console.log("[SSE] Connected successfully.")
        setIsConnected(true)
        setLoading(false)
        clearInterval(fallbackPollInterval) // Stop fallback polling since stream is open
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === "status") {
            setData(payload.data)
            setLoading(false)
          }
        } catch (err) {
          console.error("[SSE] Failed to parse payload:", err)
        }
      }

      eventSource.onerror = (err) => {
        console.warn("[SSE] Stream offline/failed. Enabling fallback polling...", err)
        setIsConnected(false)
        eventSource?.close()

        // Enable fallback polling immediately (every 5 seconds)
        clearInterval(fallbackPollInterval)
        fallbackPollInterval = setInterval(() => {
          fetchStatus(false)
        }, 5000)

        // Try to reconnect SSE in 8 seconds
        reconnectTimeout = setTimeout(connect, 8000)
      }
    }

    // Load initial data immediately to stop the rotating loader spinner
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, sanctioned effect pattern
    fetchStatus(true)
    connect()

    return () => {
      eventSource?.close()
      clearTimeout(reconnectTimeout)
      clearInterval(fallbackPollInterval)
    }
  }, [])

  async function handleTriggerWorker() {
    setActionPending(true)
    try {
      await triggerQueueWorker()
      toast.success("Worker kickstart triggered across all queues")
      fetchStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger worker")
    } finally {
      setActionPending(false)
    }
  }

  async function handleResetFailed() {
    setActionPending(true)
    try {
      await resetFailedQueueItems()
      toast.success("Failed items reset back to PENDING and enqueued for execution")
      fetchStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset tasks")
    } finally {
      setActionPending(false)
    }
  }

  const activeData = data ? data[activeTab] : null

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 rounded-lg" asChild>
                    <Link href="/dashboard/careers">
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Back to Jobs</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="size-6 text-primary animate-pulse" />
              Diagnostics Queue Stream
            </h1>
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            Real-time multi-queue diagnostics streaming active pipelines concurrently.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap pl-10 md:pl-0">
          {/* Glowing SSE status indicator */}
          <div className="flex items-center gap-1.5 bg-card/65 border border-border/50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm select-none">
            <span className={`size-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
            <span className={isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-yellow-600 dark:text-yellow-400"}>
              {isConnected ? "Live Stream Connected" : "Polling Active (Stream Offline)"}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fetchStatus(true)}
            disabled={loading || actionPending}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/5 dark:text-yellow-400"
            onClick={handleResetFailed}
            disabled={loading || actionPending}
          >
            <RotateCcw className="size-3.5" />
            Reset All Failed Tasks
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleTriggerWorker}
            disabled={loading || actionPending}
          >
            {actionPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Kickstart Queues
          </Button>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="flex gap-2 border-b border-border/60 pb-px">
        <button
          onClick={() => setActiveTab("ats")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ats"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="size-3.5" />
          ATS Applicant Scorer
          {data && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-px">
              {data.ats.pending + data.ats.processing} active
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("keyword")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "keyword"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="size-3.5" />
          Job Keyword Generator
          {data && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-px">
              {data.keyword.pending + data.keyword.processing} active
            </Badge>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Pending</span>
            <Hourglass className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-extrabold">{activeData?.pending ?? 0}</p>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Processing</span>
            <Loader2 className={`size-4 text-yellow-500 ${activeData?.processing ? "animate-spin" : ""}`} />
          </div>
          <p className="text-2xl font-extrabold text-yellow-500">{activeData?.processing ?? 0}</p>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Completed</span>
            <CheckCircle className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-500">{activeData?.completed ?? 0}</p>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Failed</span>
            <XCircle className="size-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-red-500">{activeData?.failed ?? 0}</p>
        </div>
      </div>

      {/* Memory Pipeline Diagnostics */}
      {activeData && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-primary">In-Memory Execution Diagnostics</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Reflects state of the active client-side async process scheduler.
            </p>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px]">
            <div>
              Active Workers: <span className="font-bold text-foreground">{activeData.memoryPending}</span>
            </div>
            <div>
              Buffered in Queue: <span className="font-bold text-foreground">{activeData.memorySize}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/60 bg-muted/20">
          <h2 className="font-bold text-sm">
            {activeTab === "ats" ? "Latest 50 ATS Scorer Events" : "Latest 50 Keyword Generator Events"}
          </h2>
        </div>
        
        {loading && !activeData ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-7 animate-spin text-primary" />
            <span>Loading diagnostic logs...</span>
          </div>
        ) : !activeData?.items.length ? (
          <div className="py-20 text-center text-muted-foreground text-xs">
            No pipeline events recorded.
          </div>
        ) : activeTab === "ats" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Analysis / Diagnostics</th>
                  <th className="px-5 py-3 text-right">Last Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(activeData.items as AtsQueueItem[]).map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-foreground">{item.applicantName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.applicantEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{item.job.title}</td>
                    <td className="px-4 py-3.5">
                      {item.atsStatus === "PENDING" && (
                        <Badge variant="secondary" className="uppercase text-[9px] font-bold">Pending</Badge>
                      )}
                      {item.atsStatus === "PROCESSING" && (
                        <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 uppercase text-[9px] font-bold animate-pulse">
                          Processing
                        </Badge>
                      )}
                      {item.atsStatus === "COMPLETED" && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase text-[9px] font-bold">
                          Completed
                        </Badge>
                      )}
                      {item.atsStatus === "FAILED" && (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase text-[9px] font-bold">
                          Failed
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-sm">
                      {item.atsScore !== null ? `${item.atsScore}%` : "—"}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs md:max-w-sm truncate text-muted-foreground" title={item.atsJustification || ""}>
                      {item.atsJustification || <span className="italic opacity-50">No analysis log</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[10px] text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  <th className="px-5 py-3">Job Posting</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Keywords Extracted</th>
                  <th className="px-5 py-3 text-right">Last Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(activeData.items as KeywordQueueItem[]).map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      {item.title}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.keywordStatus === "IDLE" && (
                        <Badge variant="secondary" className="uppercase text-[9px] font-bold">Idle</Badge>
                      )}
                      {item.keywordStatus === "PENDING" && (
                        <Badge variant="secondary" className="uppercase text-[9px] font-bold">Pending</Badge>
                      )}
                      {item.keywordStatus === "PROCESSING" && (
                        <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 uppercase text-[9px] font-bold animate-pulse">
                          Processing
                        </Badge>
                      )}
                      {item.keywordStatus === "COMPLETED" && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase text-[9px] font-bold">
                          Completed
                        </Badge>
                      )}
                      {item.keywordStatus === "FAILED" && (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase text-[9px] font-bold">
                          Failed
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-lg">
                        {item.keywords.length > 0 ? (
                          item.keywords.map((kw, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-px">
                              {kw}
                            </Badge>
                          ))
                        ) : (
                          <span className="italic text-muted-foreground opacity-55">No keywords extracted</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[10px] text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
