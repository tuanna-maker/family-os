import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const Route = createFileRoute("/saas/feature-flags")({
  head: () => ({ meta: [{ title: "Feature flags — SaaS" }] }),
  component: () => (
    <WorkspacePlaceholder
      title="Feature flags"
      subtitle="Bật/tắt tính năng theo tenant để rollout an toàn."
      phase="Phase 3"
      bullets={[
        "Flag theo tenant / project / role",
        "Lịch sử bật/tắt",
        "Tích hợp client SDK (resident/bql)",
      ]}
    />
  ),
});
