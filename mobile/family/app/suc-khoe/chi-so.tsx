import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";

export default function ChiSoScreen() {
  const { locale, s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const rk = h.recordKinds;
  const { isLoading, records } = useHealthOverview();

  return (
    <HealthSubScreen
      title={sp.vitalsTitle}
      subtitle={sp.vitalsSub}
      loading={isLoading}
      emptyTitle={sp.noVitals}
      emptyDescription={sp.noVitalsDesc}
      items={records.map((r) => ({
        id: r.id,
        title: r.title ?? (r.kind && r.kind in rk ? rk[r.kind as keyof typeof rk] : rk.default),
        subtitle: r.member_name ? `👤 ${r.member_name}` : undefined,
        meta: [r.value, r.recorded_at ? formatDate(r.recorded_at, locale) : null].filter(Boolean).join(" · "),
      }))}
    />
  );
}
