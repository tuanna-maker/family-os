import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";

const BACK = "/suc-khoe/don-thuoc";

export default function DonThuocScreen() {
  const { isLoading, meds } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  return (
    <HealthSubScreen
      title="Đơn thuốc"
      subtitle="Thuốc đang sử dụng của từng thành viên"
      back="/suc-khoe"
      loading={isLoading}
      actionLabel="Thêm đơn thuốc"
      onAction={() => openForm({ type: "med" })}
      emptyTitle="Chưa có đơn thuốc"
      emptyDescription="Thêm thuốc đang dùng để theo dõi và nhắc uống."
      items={meds.map((m) => ({
        id: m.id,
        emoji: avatarFor(m.member_name),
        title: m.medicine,
        subtitle: m.member_name,
        meta: m.time_of_day ? `Uống lúc ${m.time_of_day.slice(0, 5)}` : "Đang dùng",
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
