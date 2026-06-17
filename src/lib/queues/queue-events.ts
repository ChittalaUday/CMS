import { EventEmitter } from "events"

declare global {
  var queueEvents: EventEmitter | undefined
  var activeAtsTaskIds: Set<string> | undefined
  var activeKeywordTaskIds: Set<string> | undefined
}

export const queueEvents = globalThis.queueEvents || new EventEmitter()
export const activeAtsTaskIds = globalThis.activeAtsTaskIds || new Set<string>()
export const activeKeywordTaskIds = globalThis.activeKeywordTaskIds || new Set<string>()

if (process.env.NODE_ENV !== "production") {
  globalThis.queueEvents = queueEvents
  globalThis.activeAtsTaskIds = activeAtsTaskIds
  globalThis.activeKeywordTaskIds = activeKeywordTaskIds
}
