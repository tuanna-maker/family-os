import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";

const BACK = "/suc-khoe/benh-nen";

export default function BenhNenScreen() {
  const { isLoading, conditions, profiles } = useHealthOverview();
  const { openForm } = useHealthMutations(BACK);

  const profileIdByMember = (member: string) => profiles.find((p) => p.name === member)?.id;

  return (
    <HealthSubScreen
      title="Bệnh nền"
      subtitle="Bệnh mãn tính và tình trạng cần theo dõi lâu dài"
      back="/suc-khoe"
      loading={isLoading}
      actionLabel="Cập nhật bệnh nền"
      onAction={() => openForm({ type: "condition" })}
      emptyTitle="Chưa ghi nhận bệnh nền"
      emptyDescription="Thêm bệnh nền vào hồ sơ từng thành viên."
      items={conditions.map((c, i) => {
        const pid = profileIdByMember(c.member);
        return {
          id: `${c.member}-${i}`,
          emoji: avatarFor(c.member),
          title: c.member,
          subtitle: c.detail,
          onPress: () => openForm({ type: "condition", profileId: pid }),
          onEdit: () => openForm({ type: "condition", profileId: pid }),
        };
      })}
    />
  );
}
