import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/cai-dat")({
  head: () => ({ meta: [{ title: "Cài đặt — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Cài đặt nền tảng"
      subtitle="Cấu hình toàn cục: branding, email gateway, secret keys, retention."
      phase="MVP"
      bullets={[
        "Email gateway & domain",
        "Chính sách lưu trữ / xoá dữ liệu",
        "Secret keys & rotation",
      ]}
    />
  ),
});
