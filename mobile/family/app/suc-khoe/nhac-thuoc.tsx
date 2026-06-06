import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor, medCountdown } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";

const BACK = "/suc-khoe/nhac-thuoc";

export default function NhacUongThuocScreen() {
  const { isLoading, meds } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  return (
    <HealthSubScreen
      title="Nhắc uống thuốc"
      subtitle="Theo dõi lịch uống thuốc hằng ngày"
      back="/suc-khoe"
      loading={isLoading && meds.length === 0}
      actionLabel="Thêm nhắc thuốc"
      onAction={() => openForm({ type: "med" })}
      emptyTitle="Chưa có nhắc thuốc"
      emptyDescription="Thêm thuốc và giờ uống cho từng thành viên."
      items={meds.map((m) => ({
        id: m.id,
        emoji: avatarFor(m.member_name),
        title: m.medicine,
        subtitle: m.member_name,
        meta: `${(m.time_of_day ?? "08:00").slice(0, 5)} · Còn ${medCountdown(m.time_of_day)}`,
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
