import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useI18n } from "@mobile/i18n/useI18n";

const BACK = "/suc-khoe/benh-nen";

export default function BenhNenScreen() {
  const { s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, conditions, profiles } = useHealthOverview();
  const { openForm } = useHealthMutations(BACK);

  const profileIdByMember = (member: string) => profiles.find((p) => p.name === member)?.id;

  return (
    <HealthSubScreen
      title={h.chronic}
      subtitle={sp.chronicSub}
      back="/suc-khoe"
      loading={isLoading}
      actionLabel={sp.updateChronic}
      onAction={() => openForm({ type: "condition" })}
      emptyTitle={sp.noChronic}
      emptyDescription={sp.noChronicDesc}
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
