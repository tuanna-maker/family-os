import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Người gửi tự huỷ yêu cầu Bảo an khi còn open/in_progress.
 * Dùng supabaseAdmin để bypass RLS sau khi xác thực ownership ở handler.
 */
export const cancelMySecurityRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: row, error: readErr } = await supabaseAdmin
      .from("security_requests")
      .select("id, requester_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Không tìm thấy yêu cầu");
    if (row.requester_id !== userId) throw new Error("Bạn không phải người gửi yêu cầu này");
    if (row.status !== "open" && row.status !== "in_progress") {
      throw new Error("Yêu cầu đã kết thúc, không thể huỷ");
    }

    const { error } = await supabaseAdmin
      .from("security_requests")
      .update({ status: "cancelled", resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("log_audit", {
      _action: "security_request.cancelled_by_requester",
      _target_table: "security_requests",
      _target_id: data.id,
      _metadata: { by: userId } as never,
    });

    return { ok: true };
  });
