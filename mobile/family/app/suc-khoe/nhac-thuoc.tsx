import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatMedCountdown } from "@mobile/i18n/format";

const BACK = "/suc-khoe/nhac-thuoc";

export default function NhacUongThuocScreen() {
  const { locale, s } = useI18n();
  const h = s.screens.health;
  const ov = h.overview;
  const { isLoading, meds } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  return (
    <HealthSubScreen
      title={h.medicine}
      subtitle={h.medicineSub}
      back="/suc-khoe"
      loading={isLoading && meds.length === 0}
      actionLabel={h.addMedicine}
      onAction={() => openForm({ type: "med" })}
      emptyTitle={h.noMedicine}
      emptyDescription={h.noMedicineDesc}
      items={meds.map((m) => ({
        id: m.id,
        emoji: avatarFor(m.member_name),
        title: m.medicine,
        subtitle: m.member_name,
        meta: `${(m.time_of_day ?? "08:00").slice(0, 5)} · ${ov.medRemaining(formatMedCountdown(m.time_of_day, locale))}`,
        onPress: () =>
          openForm({
            type: "med",
            id: m.id,
            memberName: m.member_name,
            medicine: m.medicine,
            medTime: m.time_of_day?.slice(0, 5) ?? "08:00",
          }),
        onDelete: isPersistedHealthId(m.id)
          ? () => deleteRow({ table: "medicine_reminders", id: m.id })
          : undefined,
        deleteLabel: m.medicine,
      }))}
    />
  );
}
