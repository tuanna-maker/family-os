import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["android", "ios", "web"]),
  app: z.enum(["family", "guard", "web"]),
  device_id: z.string().max(200).optional(),
});

export const registerDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as any;
    const { error } = await sb
      .schema("platform")
      .from("device_token")
      .upsert(
        {
          user_id: context.userId,
          token: data.token,
          platform: data.platform,
          app: data.app,
          device_id: data.device_id ?? null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unregisterDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(10).max(500) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as any;
    const { error } = await sb
      .schema("platform")
      .from("device_token")
      .delete()
      .eq("user_id", context.userId)
      .eq("token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
