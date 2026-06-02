import { createFileRoute } from "@tanstack/react-router";
import { dispatchBatch } from "@/lib/notification-dispatch.server";

// Drains medicine.reminder + parent_reminder.due events from platform.outbox,
// pushing FCM notifications to the Family app via the shared dispatcher.
export const Route = createFileRoute("/api/public/hooks/dispatch-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const med = await dispatchBatch({
          priority: "P1",
          eventTypePattern: "medicine.%",
          app: "family",
          dedupeLike: (ev) => `med:${ev.aggregate_id}:%`,
          limit: 50,
        });
        const pr = await dispatchBatch({
          priority: "P1",
          eventTypePattern: "parent_reminder.%",
          app: "family",
          dedupeLike: (ev) => `pr:${ev.aggregate_id}`,
          limit: 50,
        });
        if (!med.ok || !pr.ok) {
          return Response.json(
            { ok: false, medicine: med, parent_reminder: pr },
            { status: 500 },
          );
        }
        return Response.json({
          ok: true,
          medicine: med,
          parent_reminder: pr,
        });
      },
    },
  },
});
