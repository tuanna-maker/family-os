import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/users")({
  head: () => ({ meta: [{ title: "Người dùng — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Người dùng nền tảng"
      subtitle="Tìm kiếm user toàn hệ thống, gán role, đình chỉ tài khoản."
      phase="MVP"
      bullets={[
        "Tìm kiếm user theo email/tên",
        "Gán role (super_admin, saas_admin, tenant_admin…)",
        "Audit thay đổi quyền",
      ]}
    />
  ),
});
