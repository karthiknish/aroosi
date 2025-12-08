export type LogLevel = "debug" | "info" | "warn" | "error";

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "info";
}

function levelPriority(level: LogLevel): number {
  switch (level) {
    case "debug":
      return 10;
    case "info":
      return 20;
    case "warn":
      return 30;
    case "error":
      return 40;
  }
}

function enabled(target: LogLevel): boolean {
  return levelPriority(target) >= levelPriority(currentLevel());
}

export function getCorrelationIdFromHeaders(headers: Headers | null | undefined): string {
  try {
    const cid = headers?.get("x-correlation-id") || headers?.get("X-Correlation-Id");
    if (cid && cid.trim().length > 0) return cid.trim();
  } catch {
    // ignore
  }
  // Generate a short id – safe for logs only
  return Math.random().toString(36).slice(2, 10);
}

type LogMeta = Record<string, unknown> | undefined;

function baseLog(level: LogLevel, message: string, meta?: LogMeta) {
  if (!enabled(level)) return;
  const payload = meta && Object.keys(meta).length > 0 ? { message, ...meta } : { message };
  const line = JSON.stringify(payload);
  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export function logDebug(message: string, meta?: LogMeta) {
  baseLog("debug", message, meta);
}
export function logInfo(message: string, meta?: LogMeta) {
  baseLog("info", message, meta);
}
export function logWarn(message: string, meta?: LogMeta) {
  baseLog("warn", message, meta);
}
export function logError(message: string, meta?: LogMeta) {
  baseLog("error", message, meta);
}

export function errorMeta(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    return { error: e.message, name: e.name, stack: e.stack };
  }
  return { error: String(e) };
}


