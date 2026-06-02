import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/leads")({
  head: () => ({ meta: [{ title: "Leads & demo — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Leads & yêu cầu demo"
      subtitle="Khách hàng tiềm năng từ form /demo và /lien-he."
      phase="MVP"
      bullets={[
        "Danh sách demo_leads",
        "Phân loại theo trạng thái: new / contacted / qualified / won",
        "Chuyển đổi lead thành tenant",
      ]}
    />
  ),
});
