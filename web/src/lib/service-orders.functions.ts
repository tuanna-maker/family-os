import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ServiceCategory = "package" | "helper";

export type ServiceOrderRow = {
  id: string;
  request_type: string;
  category: ServiceCategory;
  title: string;
  ticket_code: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

const PACKAGE_TYPES = ["package", "shipping", "delivery", "remote_freight"];
const HELPER_TYPES = ["home_care", "escort", "guard_handle", "hourly_guard", "custom_guard"];

const TITLE: Record<string, string> = {
  package: "Nhận & giữ hàng hộ",
  shipping: "Gửi hàng đi",
  delivery: "Giao tận căn hộ",
  remote_freight: "Chuyển hàng từ xa",
  home_care: "Chăm sóc tại nhà",
  escort: "Đưa đón lên/xuống căn hộ",
  guard_handle: "Bảo vệ hỗ trợ khi vắng nhà",
  hourly_guard: "Bảo vệ theo giờ",
  custom_guard: "Bảo vệ theo nhu cầu riêng",
};


export const listMyServiceOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ServiceOrderRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, request_type, status, created_at, resolved_at, payload")
      .eq("requester_id", userId)
      .in("request_type", [...PACKAGE_TYPES, ...HELPER_TYPES])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const t = r.request_type as string;
      return {
        id: r.id as string,
        request_type: t,
        category: PACKAGE_TYPES.includes(t) ? "package" : "helper",
        title: TITLE[t] ?? "Yêu cầu",
        ticket_code: (p.ticket_code as string) ?? null,
        status: r.status as string,
        created_at: r.created_at as string,
        resolved_at: r.resolved_at as string | null,
      };
    });
  });
