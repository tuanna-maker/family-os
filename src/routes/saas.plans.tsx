import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/plans")({
  head: () => ({ meta: [{ title: "Gói dịch vụ — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Gói dịch vụ"
      subtitle="Cấu hình plan Starter / Pro / Enterprise và quota cho tenant."
      phase="Phase 2"
      bullets={[
        "Định nghĩa plan & quota (căn hộ, user, dung lượng)",
        "Gán plan cho tenant",
        "Lịch sử nâng hạ cấp",
      ]}
    />
  ),
});
