import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "security-attachments";

const fileSchema = z.object({
  path: z.string().min(3).max(500),
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
  mime: z.string().min(1).max(120),
});

/** Records uploaded files against a security request as a sos_events row.
 *  Storage upload itself is done client-side via supabase.storage so RLS
 *  on storage.objects authorizes per request_id/path. */
export const attachSecurityRequestEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      files: z.array(fileSchema).min(1).max(10),
      note: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Guard: path prefix must match request id
    for (const f of data.files) {
      const prefix = f.path.split("/")[0];
      if (prefix !== data.id) {
        throw new Error("Đường dẫn tệp không hợp lệ");
      }
    }
    const { error } = await supabase.from("sos_events").insert({
      request_id: data.id,
      actor_id: userId,
      event_type: "attachment",
      note: data.note ?? `Đã đính kèm ${data.files.length} tệp`,
      metadata: { attachments: data.files } as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Returns short-lived signed URLs for attachment paths. */
export const signSecurityAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ paths: z.array(z.string().min(3).max(500)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: signed, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrls(data.paths, 60 * 30); // 30 min
    if (error) throw new Error(error.message);
    return (signed ?? []).map((s) => ({ path: s.path ?? "", url: s.signedUrl }));
  });
