import { createFileRoute } from "@tanstack/react-router";
import { dispatchBatch } from "@/lib/notification-dispatch.server";

export const Route = createFileRoute("/api/public/hooks/dispatch-sos")({
  server: {
    handlers: {
      POST: async () => {
        const result = await dispatchBatch({
          priority: "P0",
          eventTypePattern: "sos.%",
          app: "guard",
          dedupeLike: (ev) => `sos:${ev.aggregate_id}:%`,
          limit: 20,
        });
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: 500 });
        }
        return Response.json(result);
      },
    },
  },
});
