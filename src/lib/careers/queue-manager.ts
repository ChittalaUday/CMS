import PQueue from "p-queue"

declare global {
  var atsQueue: PQueue | undefined
  var keywordQueue: PQueue | undefined
}

// Concurrency: 1 for local heavy LLM execution (ATS), 2 for lighter keyword extractions
export const atsQueue = globalThis.atsQueue || new PQueue({ concurrency: 1 })
export const keywordQueue = globalThis.keywordQueue || new PQueue({ concurrency: 2 })

if (process.env.NODE_ENV !== "production") {
  globalThis.atsQueue = atsQueue
  globalThis.keywordQueue = keywordQueue
}
