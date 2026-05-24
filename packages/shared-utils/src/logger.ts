type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogEntry = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  user_id?: string;
  app: "family" | "guard";
  session_id: string;
  device_info?: Record<string, unknown>;
  ts: string;
};

const FLUSH_SIZE = 10;
const FLUSH_MS = 5_000;

let buffer: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sessionId = crypto.randomUUID();
let appName: "family" | "guard" = "family";
let ingestUrl = "/functions/v1/log-ingest";

export function initLogger(opts: { app: "family" | "guard"; ingestUrl?: string; sessionId?: string }) {
  appName = opts.app;
  if (opts.ingestUrl) ingestUrl = opts.ingestUrl;
  if (opts.sessionId) sessionId = opts.sessionId;

  if (typeof window !== "undefined") {
    window.addEventListener("error", (e) => {
      error(e.message, { filename: e.filename, lineno: e.lineno, colno: e.colno });
      flush(true);
    });
    window.addEventListener("unhandledrejection", (e) => {
      error(String(e.reason), { type: "unhandledrejection" });
      flush(true);
    });
  }
}

function enqueue(level: LogLevel, message: string, context?: Record<string, unknown>, userId?: string) {
  buffer.push({
    level,
    message,
    context,
    user_id: userId,
    app: appName,
    session_id: sessionId,
    device_info: typeof navigator !== "undefined" ? { ua: navigator.userAgent } : undefined,
    ts: new Date().toISOString(),
  });
  if (buffer.length >= FLUSH_SIZE) void flush();
  else scheduleFlush();
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
}

export async function flush(force = false) {
  if (!buffer.length) return;
  if (!force && buffer.length < FLUSH_SIZE) return;
  const batch = buffer.splice(0, buffer.length);
  try {
    const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!base) return;
    await fetch(`${base}${ingestUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: batch }),
    });
  } catch {
    buffer.unshift(...batch);
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>, uid?: string) => enqueue("debug", msg, ctx, uid),
  info: (msg: string, ctx?: Record<string, unknown>, uid?: string) => enqueue("info", msg, ctx, uid),
  warn: (msg: string, ctx?: Record<string, unknown>, uid?: string) => enqueue("warn", msg, ctx, uid),
  error: (msg: string, ctx?: Record<string, unknown>, uid?: string) => enqueue("error", msg, ctx, uid),
  fatal: (msg: string, ctx?: Record<string, unknown>, uid?: string) => enqueue("fatal", msg, ctx, uid),
  navigation: (path: string, uid?: string) => enqueue("info", "navigation", { path }, uid),
  apiError: (endpoint: string, err: string, ms?: number, uid?: string) =>
    enqueue("error", "api_error", { endpoint, err, ms }, uid),
  slowQuery: (endpoint: string, ms: number, uid?: string) =>
    enqueue("warn", "slow_query", { endpoint, ms }, uid),
};

export function error(message: string, context?: Record<string, unknown>, userId?: string) {
  enqueue("error", message, context, userId);
}
