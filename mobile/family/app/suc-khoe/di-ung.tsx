import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";

const BACK = "/suc-khoe/di-ung";

export default function DiUngScreen() {
  const { isLoading, allergies, profiles } = useHealthOverview();
  const { openForm } = useHealthMutations(BACK);

  const profileIdByMember = (member: string) => profiles.find((p) => p.name === member)?.id;

  return (
    <HealthSubScreen
      title="Dị ứng"
      subtitle="Ghi nhận dị ứng thực phẩm, thuốc và môi trường"
      back="/suc-khoe"
      loading={isLoading}
      actionLabel="Cập nhật dị ứng"
      onAction={() => openForm({ type: "allergy" })}
      emptyTitle="Chưa ghi nhận dị ứng"
      emptyDescription="Thêm thông tin dị ứng vào hồ sơ từng thành viên."
      items={allergies.map((a, i) => {
        const pid = profileIdByMember(a.member);
        return {
          id: `${a.member}-${i}`,
          emoji: avatarFor(a.member),
          title: a.member,
          subtitle: a.detail,
          onPress: () => openForm({ type: "allergy", profileId: pid }),
          onEdit: () => openForm({ type: "allergy", profileId: pid }),
        };
      })}
    />
  );
}
