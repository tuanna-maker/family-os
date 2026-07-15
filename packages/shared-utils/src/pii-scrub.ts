/** PII scrub — dùng chung cho log-ingest client và Sentry beforeSend. */

export const PII_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/gi,
  /\b0\d{9,10}\b/g,
];

export const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "secret",
  "api_key",
  "apikey",
  "dsn",
]);

export function scrubLogMessage(message: string, maxLen = 2000): string {
  let out = message;
  for (const pattern of PII_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out.slice(0, maxLen);
}

export function scrubLogValue(value: unknown): unknown {
  if (typeof value === "string") return scrubLogMessage(value);
  if (Array.isArray(value)) return value.map(scrubLogValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : scrubLogValue(val);
    }
    return out;
  }
  return value;
}

/** Scrub Sentry event JSON (beforeSend). */
export function scrubSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  if (typeof event.message === "string") {
    event.message = scrubLogMessage(event.message);
  }
  if (event.extra && typeof event.extra === "object") {
    event.extra = scrubLogValue(event.extra);
  }
  if (event.contexts && typeof event.contexts === "object") {
    event.contexts = scrubLogValue(event.contexts);
  }
  const exceptions = event.exception as { values?: Array<{ value?: string }> } | undefined;
  if (exceptions?.values) {
    for (const ex of exceptions.values) {
      if (typeof ex.value === "string") ex.value = scrubLogMessage(ex.value);
    }
  }
  const breadcrumbs = event.breadcrumbs as
    | { values?: Array<{ message?: string; data?: Record<string, unknown> }> }
    | undefined;
  if (breadcrumbs?.values) {
    for (const crumb of breadcrumbs.values) {
      if (typeof crumb.message === "string") crumb.message = scrubLogMessage(crumb.message);
      if (crumb.data) crumb.data = scrubLogValue(crumb.data) as Record<string, unknown>;
    }
  }
  return event;
}
