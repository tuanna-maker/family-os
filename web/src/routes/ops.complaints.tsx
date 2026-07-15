import { createFileRoute } from "@tanstack/react-router";
import { RequestsDetail } from "@/features/ops/detail/RequestsDetail";

export const Route = createFileRoute("/ops/complaints")({
  head: () => ({ meta: [{ title: "Phản ánh cư dân — STOS Ops" }] }),
  component: () => (
    <RequestsDetail
      title="Phản ánh cư dân"
      subtitle="Toàn bộ phản ánh & khiếu nại đang chờ xử lý"
      kind="complaint"
    />
  ),
});
