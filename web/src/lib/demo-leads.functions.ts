import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const leadSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(40).regex(/^[+\d\s().-]+$/, "Số điện thoại không hợp lệ"),
  role: z.string().trim().max(120).optional().nullable(),
  project_name: z.string().trim().max(200).optional().nullable(),
  scale: z.string().trim().max(80).optional().nullable(),
  source: z.string().trim().max(60).default("landing_bql"),
  message: z.string().trim().max(2000).optional().nullable(),
});

export const submitDemoLead = createServerFn({ method: "POST" })
  .inputValidator((input) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    const { error, data: row } = await supabaseAdmin
      .from("demo_leads")
      .insert({
        full_name: data.full_name,
        company: data.company || null,
        email: data.email,
        phone: data.phone,
        role: data.role || null,
        project_name: data.project_name || null,
        scale: data.scale || null,
        source: data.source || "landing_bql",
        message: data.message || null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("submitDemoLead error", error);
      return { ok: false as const, error: "Không thể gửi yêu cầu, vui lòng thử lại." };
    }
    return { ok: true as const, id: row.id, createdAt: row.created_at };
  });
