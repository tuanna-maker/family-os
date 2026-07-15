import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useI18n } from "@mobile/i18n/useI18n";

const BACK = "/suc-khoe/don-thuoc";

export default function DonThuocScreen() {
  const { s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, meds } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  return (
    <HealthSubScreen
      title={h.prescription}
      subtitle={sp.prescriptionSub}
      back="/suc-khoe"
      loading={isLoading}
      actionLabel={sp.addPrescription}
      onAction={() => openForm({ type: "med" })}
      emptyTitle={sp.noPrescription}
      emptyDescription={sp.noPrescriptionDesc}
      items={meds.map((m) => ({
        id: m.id,
        emoji: avatarFor(m.member_name),
        title: m.medicine,
        subtitle: m.member_name,
        meta: m.time_of_day ? sp.takeAt(m.time_of_day.slice(0, 5)) : sp.inUse,
        onPress: () => openForm({ type: "med", id: m.id }),
        onEdit: () => openForm({ type: "med", id: m.id }),
        onDelete: isPersistedHealthId(m.id)
          ? () => deleteRow({ table: "medicine_reminders", id: m.id })
          : undefined,
        deleteLabel: m.medicine,
      }))}
    />
  );
}
