import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/bql/su-co")({
  head: () => ({ meta: [{ title: "Sự cố — BQL" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Sự cố vận hành"
      subtitle="Tiếp nhận, phân công và theo dõi sự cố hạ tầng, thiết bị, an ninh."
      phase="MVP"
      bullets={[
        "Phân loại sự cố theo mức độ (P1/P2/P3)",
        "Gán kỹ thuật viên / bảo an",
        "SLA & timeline xử lý",
      ]}
    />
  ),
});
