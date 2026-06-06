import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor, formatApptShort, isApptUpcoming } from "@mobile/components/health/healthVisuals";
import { toLocalIso } from "@mobile/components/DateTimeField";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";

const BACK = "/suc-khoe/dat-lich";

export default function DatLichKhamScreen() {
  const { isLoading, appts } = useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);
  const upcoming = appts.filter(isApptUpcoming);

  return (
    <HealthSubScreen
      title="Đặt lịch khám"
      subtitle="Lên lịch khám cho từng thành viên"
      back="/suc-khoe"
      loading={isLoading && upcoming.length === 0}
      actionLabel="Thêm lịch khám mới"
      onAction={() => openForm({ type: "appt" })}
      emptyTitle="Chưa có lịch khám"
      emptyDescription="Thêm lịch khám để cả nhà không bỏ lỡ buổi hẹn."
      items={upcoming.map((a) => ({
        id: a.id,
        emoji: avatarFor(a.member_name),
        title: a.doctor ?? "Khám tổng quát",
        subtitle: `👤 ${a.member_name}`,
        meta: formatApptShort(a.scheduled_at),
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
