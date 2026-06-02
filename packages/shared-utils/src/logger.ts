import { scrubLogMessage, scrubLogValue } from "./pii-scrub";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/** Payload gửi log-ingest — không có user_id (server lấy từ JWT). */
export type LogEntry = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  app: "family" | "guard";
  session_id?: string;
  device_info?: Record<string, unknown>;
  ts?: string;
};

const FLUSH_MS = 5_000;
const MAX_BATCH = 50;
const MAX_BUFFER = 200;
const MAX_MESSAGE = 2000;
const MAX_SESSION_ID = 64;

let buffer: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sessionId = crypto.randomUUID().slice(0, MAX_SESSION_ID);
let appName: "family" | "guard" = "family";
let ingestUrl = "/functions/v1/log-ingest";
let getAccessToken: (() => Promise<string | null>) | null = null;

function toPayload(entry: Omit<LogEntry, "app">): LogEntry {
  const message = scrubLogMessage(entry.message);
  if (!message) throw new Error("log message required");
  return {
    level: entry.level,
    message,
    context: (scrubLogValue(entry.context ?? {}) as Record<string, unknown>) ?? {},
    app: appName,
    session_id: (entry.session_id ?? sessionId).slice(0, MAX_SESSION_ID),
    device_info: entry.device_info
      ? (scrubLogValue(entry.device_info) as Record<string, unknown>)
      : undefined,
    ts: entry.ts ?? new Date().toISOString(),
  };
}

export type InitLoggerOptions = {
  app: "family" | "guard";
  ingestUrl?: string;
  sessionId?: string;
  /** Bắt buộc khi verify_jwt=true — trả JWT người dùng đang đăng nhập. */
  getAccessToken: () => Promise<string | null>;
};

export function initLogger(opts: InitLoggerOptions) {
  appName = opts.app;
  getAccessToken = opts.getAccessToken;
  if (opts.ingestUrl) ingestUrl = opts.ingestUrl;
  if (opts.sessionId) sessionId = opts.sessionId.slice(0, MAX_SESSION_ID);

  if (typeof window === "undefined") return;

  window.addEventListener("error", (e) => {
    error(e.message, { filename: e.filename, lineno: e.lineno, colno: e.colno });
    void flush(true);
  });
  window.addEventListener("unhandledrejection", (e) => {
    error(String(e.reason), { type: "unhandledrejection" });
    void flush(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
  window.addEventListener("pagehide", () => {
    void flush(true);
  });
}

function enqueue(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!message.trim()) return;
  try {
    buffer.push(
      toPayload({
        level,
        message,
        context,
        device_info:
          typeof navigator !== "undefined" ? { ua: navigator.userAgent.slice(0, 256) } : undefined,
      }),
    );
  } catch {
    return;
  }
  if (buffer.length >= MAX_BATCH) void flush();
  else scheduleFlush();
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
}

export async function flush(_force = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;
  if (!getAccessToken) return;

  const token = await getAccessToken();
  if (!token) return;

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base || !anonKey) return;

  const logs = buffer.splice(0, MAX_BATCH);
  const requestId = crypto.randomUUID();

  try {
    const res = await fetch(`${base}${ingestUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "x-request-id": requestId,
      },
      body: JSON.stringify({ logs }),
    });
    if (!res.ok) throw new Error(`log-ingest ${res.status}`);
  } catch (e) {
    if (buffer.length + logs.length <= MAX_BUFFER) {
      buffer.unshift(...logs);
    }
    console.warn("log-ingest failed", e);
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => enqueue("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => enqueue("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => enqueue("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => enqueue("error", msg, ctx),
  fatal: (msg: string, ctx?: Record<string, unknown>) => enqueue("fatal", msg, ctx),
  navigation: (path: string) => enqueue("info", "navigation", { path }),
  apiError: (endpoint: string, err: string, ms?: number) =>
    enqueue("error", "api_error", { endpoint, err, ms }),
  slowQuery: (endpoint: string, ms: number) =>
    enqueue("warn", "slow_query", { endpoint, ms }),
};

export function error(message: string, context?: Record<string, unknown>) {
  enqueue("error", message, context);
}
