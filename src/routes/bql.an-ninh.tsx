import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/bql/an-ninh")({
  head: () => ({ meta: [{ title: "An ninh — BQL" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Trung tâm an ninh"
      subtitle="SOS, camera, tuần tra, sự cố an ninh."
      phase="Phase 2"
      bullets={[
        "Bản đồ sự cố theo realtime",
        "Lịch tuần tra & checkpoint NFC",
        "Tích hợp camera & barrier",
      ]}
    />
  ),
});
