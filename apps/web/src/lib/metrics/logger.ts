// Lightweight structured logging & timing utility
// Usage:
// const span = startSpan('recommendations.compute', { userId });
// ... work ...
// span.end({ candidates: list.length });

export interface LogMeta { [key: string]: any; }

interface SpanHandle {
  end(extra?: LogMeta): void;
  warn(msg: string, extra?: LogMeta): void;
  error(msg: string, extra?: LogMeta): void;
}

function basePayload(level: string, name: string, meta?: LogMeta) {
  return {
    ts: new Date().toISOString(),
    level,
    name,
    ...(meta || {}),
  };
}

export function logInfo(name: string, meta?: LogMeta) {
  console.info(basePayload('info', name, meta));
}
export function logWarn(name: string, meta?: LogMeta) {
  console.warn(basePayload('warn', name, meta));
}
export function logError(name: string, meta?: LogMeta) {
  console.error(basePayload('error', name, meta));
}

export function startSpan(name: string, meta?: LogMeta): SpanHandle {
  const start = Date.now();
  const correlationId = meta?.correlationId || Math.random().toString(36).slice(2, 10);
  logInfo(name + '.start', { correlationId, ...(meta || {}) });
  return {
    end(extra) {
      logInfo(name + '.end', {
        correlationId,
        durationMs: Date.now() - start,
        ...(meta || {}),
        ...(extra || {}),
      });
    },
    warn(msg, extra) {
      logWarn(name + '.warn', { correlationId, msg, ...(meta || {}), ...(extra || {}) });
    },
    error(msg, extra) {
      logError(name + '.error', { correlationId, msg, ...(meta || {}), ...(extra || {}) });
    },
  };
}

export function timeFn<T>(name: string, fn: () => Promise<T>, meta?: LogMeta): Promise<T> {
  const span = startSpan(name, meta);
  return fn()
    .then((res) => {
      span.end();
      return res;
    })
    .catch((err) => {
      span.error('exception', { message: err instanceof Error ? err.message : String(err) });
      throw err;
    });
}
