import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/billing")({
  head: () => ({ meta: [{ title: "Doanh thu — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Doanh thu nền tảng"
      subtitle="MRR, ARR, hoá đơn cho tenant, đối soát doanh thu STOS."
      phase="Phase 2"
      bullets={[
        "MRR / ARR theo plan",
        "Hoá đơn tenant & trạng thái thanh toán",
        "Export báo cáo doanh thu",
      ]}
    />
  ),
});
