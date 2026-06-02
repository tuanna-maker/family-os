import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public RUM endpoint: nhận Web Vitals từ trình duyệt qua sendBeacon (no auth).
// Bảo vệ tối thiểu: validate schema, giới hạn batch size, không trả PII.
const MetricSchema = z.object({
  metric: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  value: z.number().min(0).max(600_000),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  route: z.string().max(200).optional(),
  page: z.string().max(500).optional(),
  nav_type: z.string().max(40).optional(),
});

const BodySchema = z.object({
  metrics: z.array(MetricSchema).min(1).max(10),
});

export const Route = createFileRoute("/api/public/vitals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const parsed = BodySchema.safeParse(json);
        if (!parsed.success) return new Response("Invalid", { status: 400 });

        const ua = (request.headers.get("user-agent") ?? "").slice(0, 300);
        const rows = parsed.data.metrics.map((m) => ({ ...m, ua }));

        const { error } = await (supabaseAdmin as any)
          .schema("platform")
          .from("web_vitals")
          .insert(rows);
        if (error) return new Response("DB error", { status: 500 });
        return new Response(null, { status: 204 });
      },
    },
  },
});
