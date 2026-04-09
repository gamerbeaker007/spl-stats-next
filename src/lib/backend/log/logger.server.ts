import { createLog, type LogLevel } from "@/lib/backend/db/logs";

function consoleLog(level: LogLevel, message: string) {
  const ts = new Date().toISOString();
  if (level === "error") {
    console.error(`${ts} [${level.toUpperCase()}]: ${message}`);
  } else if (level === "warn") {
    console.warn(`${ts} [${level.toUpperCase()}]: ${message}`);
  } else {
    console.log(`${ts} [${level.toUpperCase()}]: ${message}`);
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  consoleLog(level, message);
  // Fire-and-forget: don't block the caller, and don't crash if DB is unavailable.
  createLog(level, message, meta).catch((err) => {
    console.error(`[logger] Failed to write log to DB: ${err}`);
  });
}

const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};

export default logger;
