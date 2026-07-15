import { createFileRoute } from "@tanstack/react-router";
import { RequestsDetail } from "@/features/ops/detail/RequestsDetail";

export const Route = createFileRoute("/ops/work-orders")({
  head: () => ({ meta: [{ title: "Lệnh công việc — STOS Ops" }] }),
  component: () => (
    <RequestsDetail
      title="Lệnh công việc"
      subtitle="Bảo trì, kỹ thuật, vệ sinh, thang máy, điện"
      kind="work_order"
    />
  ),
});
