import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatApptTime } from "@mobile/i18n/format";

const BACK = "/suc-khoe/lich-kham";

export default function LichKhamScreen() {
  const { locale, s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, appts } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  return (
    <HealthSubScreen
      title={h.appointment}
      subtitle={sp.apptListSub}
      back="/suc-khoe"
      loading={isLoading}
      actionLabel={h.addAppt}
      onAction={() => openForm({ type: "appt" })}
      emptyTitle={h.noAppt}
      emptyDescription={sp.apptEmptyDesc}
      items={appts.map((a) => ({
        id: a.id,
        emoji: avatarFor(a.member_name),
        title: a.doctor ?? h.overview.generalCheckup,
        subtitle: `👤 ${a.member_name}`,
        meta: `${formatApptTime(a.scheduled_at, locale)} · ${a.status === "planned" ? sp.statusUpcoming : a.status}`,
        onPress: () => openForm({ type: "appt", id: a.id }),
        onEdit: () => openForm({ type: "appt", id: a.id }),
        onDelete: isPersistedHealthId(a.id)
          ? () => deleteRow({ table: "medical_appointments", id: a.id })
          : undefined,
        deleteLabel: a.doctor ?? a.member_name,
      }))}
    />
  );
}
