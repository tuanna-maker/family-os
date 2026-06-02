import * as Sentry from "@sentry/capacitor";
import { init as reactInit, type ErrorEvent, type EventHint } from "@sentry/react";
import { scrubSentryEvent } from "@shared/utils/pii-scrub";

export function initSentry(): boolean {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return false;

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
