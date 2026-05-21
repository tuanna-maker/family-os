import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/incidents")({
  head: () => ({ meta: [{ title: "Sự cố hệ thống — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Sự cố hệ thống"
      subtitle="Theo dõi downtime, lỗi nền tảng, cảnh báo bảo mật."
      phase="MVP"
      bullets={[
        "Trạng thái dịch vụ realtime",
        "Postmortem & root cause",
        "Thông báo tới tenant bị ảnh hưởng",
      ]}
    />
  ),
});
