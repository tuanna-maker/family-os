import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/bql/du-an")({
  head: () => ({ meta: [{ title: "Dự án — BQL" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Quản lý dự án"
      subtitle="Danh sách dự án thuộc tenant, thông số tổng quan, trạng thái vận hành."
      phase="MVP"
      bullets={[
        "Hiển thị danh sách project theo tenant_id hiện tại",
        "Bộ lọc theo thành phố, trạng thái vận hành",
        "Card tóm tắt: số block, số căn hộ, tỉ lệ lấp đầy",
      ]}
    />
  ),
});
