import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor, formatApptShort } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";

const BACK = "/suc-khoe/lich-kham";

export default function LichKhamScreen() {
  const { isLoading, appts } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  return (
    <HealthSubScreen
      title="Lịch khám"
      subtitle="Tất cả lịch hẹn khám bệnh"
      back="/suc-khoe"
      loading={isLoading}
      actionLabel="Thêm lịch khám"
      onAction={() => openForm({ type: "appt" })}
      emptyTitle="Chưa có lịch khám"
      emptyDescription="Lên lịch khám để cả nhà theo dõi dễ dàng."
      items={appts.map((a) => ({
        id: a.id,
        emoji: avatarFor(a.member_name),
        title: a.doctor ?? "Khám tổng quát",
        subtitle: `👤 ${a.member_name}`,
        meta: `${formatApptShort(a.scheduled_at)} · ${a.status === "planned" ? "Sắp tới" : a.status}`,
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
