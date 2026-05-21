import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/bql/bao-cao")({
  head: () => ({ meta: [{ title: "Báo cáo — BQL" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Báo cáo vận hành"
      subtitle="Dashboard, KPI, export Excel/PDF cho ban quản lý & chủ đầu tư."
      phase="Phase 2"
      bullets={[
        "KPI: tỉ lệ giải quyết yêu cầu, SLA, doanh thu",
        "Xuất Excel/PDF báo cáo định kỳ",
        "Bộ lọc theo dự án / khoảng thời gian",
      ]}
    />
  ),
});
