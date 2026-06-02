import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/audit")({
  head: () => ({ meta: [{ title: "Audit log — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Audit log nền tảng"
      subtitle="Toàn bộ hành động admin: role change, tenant config, data export."
      phase="MVP"
      bullets={[
        "Bộ lọc theo actor / module / khoảng thời gian",
        "Export CSV phục vụ compliance",
        "Cảnh báo hành vi bất thường",
      ]}
    />
  ),
});
