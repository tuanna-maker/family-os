import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/bql/cai-dat")({
  head: () => ({ meta: [{ title: "Cài đặt — BQL" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Cài đặt BQL"
      subtitle="Cấu hình SLA, kênh thông báo, template email/SMS, branding dự án."
      phase="MVP"
      bullets={[
        "SLA yêu cầu dịch vụ",
        "Kênh thông báo (push/email/SMS)",
        "Branding logo & tên dự án",
      ]}
    />
  ),
});
