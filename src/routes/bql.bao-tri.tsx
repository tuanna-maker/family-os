import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/bql/bao-tri")({
  head: () => ({ meta: [{ title: "Bảo trì — BQL" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Bảo trì tài sản"
      subtitle="Kế hoạch PM (preventive maintenance) cho thang máy, MEP, PCCC."
      phase="Phase 3"
      bullets={[
        "Danh mục tài sản & vòng đời",
        "Lịch bảo trì định kỳ + nhắc việc",
        "Log bảo trì & chi phí",
      ]}
    />
  ),
});
