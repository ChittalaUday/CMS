import { NextRequest } from "next/server"
import { queueEvents } from "@/lib/queues/queue-events"
import { getQueueStatus } from "@/app/dashboard/careers/actions"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  let keepAliveInterval: NodeJS.Timeout

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (e) {
          // controller might be closed
        }
      }

      // 1. Send initial status
      try {
        const initialStatus = await getQueueStatus()
        sendEvent({ type: "status", data: initialStatus })
      } catch (err) {
        console.error("[SSE] Failed to send initial status:", err)
      }

      // 2. Change listener
      const onChange = async () => {
        try {
          const currentStatus = await getQueueStatus()
          sendEvent({ type: "status", data: currentStatus })
        } catch (err) {
          console.error("[SSE] Failed to send updated status:", err)
        }
      }

      queueEvents.on("change", onChange)

      // 3. Keep-alive ping every 10 seconds
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch (e) {
          // ignore
        }
      }, 10000)

      // 4. Cleanup on abort
      req.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval)
        queueEvents.off("change", onChange)
        try {
          controller.close()
        } catch (e) {}
        console.log("[SSE] Connection aborted by client.")
      })
    },
    cancel() {
      clearInterval(keepAliveInterval)
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  })
}
