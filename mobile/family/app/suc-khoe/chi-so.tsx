import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { RECORD_KIND_LABEL } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";

export default function ChiSoScreen() {
  const { isLoading, records } = useHealthOverview();

  return (
    <HealthSubScreen
      title="Chỉ số"
      subtitle="Cân nặng, huyết áp, xét nghiệm và các chỉ số khác"
      loading={isLoading}
      emptyTitle="Chưa có chỉ số"
      emptyDescription="Ghi nhận chỉ số sức khỏe trong Quản lý sức khỏe."
      items={records.map((r) => ({
        id: r.id,
        title: r.title ?? RECORD_KIND_LABEL[r.kind ?? ""] ?? "Chỉ số",
        subtitle: r.member_name ? `👤 ${r.member_name}` : undefined,
        meta: [r.value, r.recorded_at].filter(Boolean).join(" · "),
      }))}
    />
  );
}
