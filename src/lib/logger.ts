import pino from "pino"
import path from "path"

const isDev = process.env.NODE_ENV !== "production"
const logDir = process.env.LOG_DIR ?? "logs"

const streams: pino.StreamEntry[] = isDev
  ? [
      // Dev: pretty-print to stdout only
      {
        level: "debug",
        stream: pino.transport({ target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } }),
      },
    ]
  : [
      // Production: structured JSON to stdout (captured by hosting infra)
      { level: "info", stream: process.stdout },
      // Production: error-level and above to a rolling log file
      {
        level: "error",
        stream: pino.destination({
          dest: path.join(process.cwd(), logDir, "error.log"),
          sync: false,
          mkdir: true,
        }),
      },
    ]

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: { env: process.env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label }
      },
    },
  },
  pino.multistream(streams)
)

export default logger
