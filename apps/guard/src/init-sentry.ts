import type { ErrorEvent, EventHint } from "@sentry/react";

export async function initSentry(): Promise<boolean> {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return false;

  const Sentry = await import("@sentry/capacitor");
  const { init: reactInit } = await import("@sentry/react");
  const { scrubSentryEvent } = await import("@shared/utils/pii-scrub");

  Sentry.init(
    {
      dsn,
      tracesSampleRate: 0.2,
      environment: import.meta.env.PROD ? "production" : "development",
      initialScope: { tags: { app: "guard" } },
      beforeSend(event: ErrorEvent, _hint: EventHint) {
        return scrubSentryEvent(event as unknown as Record<string, unknown>) as ErrorEvent;
      },
    },
    reactInit,
  );
  return true;
}
