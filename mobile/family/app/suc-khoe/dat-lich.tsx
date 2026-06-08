import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor, isApptUpcoming } from "@mobile/components/health/healthVisuals";
import { toLocalIso } from "@mobile/components/DateTimeField";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatApptTime } from "@mobile/i18n/format";

const BACK = "/suc-khoe/dat-lich";

export default function DatLichKhamScreen() {
  const { locale, s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, appts } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);
  const upcoming = appts.filter(isApptUpcoming);

  return (
    <HealthSubScreen
      title={h.bookAppt}
      subtitle={sp.bookApptSub}
      back="/suc-khoe"
      loading={isLoading && upcoming.length === 0}
      actionLabel={sp.addApptNew}
      onAction={() => openForm({ type: "appt" })}
      emptyTitle={h.noAppt}
      emptyDescription={sp.bookApptEmptyDesc}
      items={upcoming.map((a) => ({
        id: a.id,
        emoji: avatarFor(a.member_name),
        title: a.doctor ?? h.overview.generalCheckup,
        subtitle: `👤 ${a.member_name}`,
        meta: formatApptTime(a.scheduled_at, locale),
        onPress: () =>
          openForm({
            type: "appt",
            id: a.id,
            memberName: a.member_name,
            doctor: a.doctor ?? "",
            apptAt: toLocalIso(new Date(a.scheduled_at)),
          }),
        onDelete: isPersistedHealthId(a.id)
          ? () => deleteRow({ table: "medical_appointments", id: a.id })
          : undefined,
        deleteLabel: a.doctor ?? a.member_name,
      }))}
    />
  );
}
