import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useI18n } from "@mobile/i18n/useI18n";

const BACK = "/suc-khoe/di-ung";

export default function DiUngScreen() {
  const { s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, allergies, profiles } = useHealthOverview();
  const { openForm } = useHealthMutations(BACK);

  const profileIdByMember = (member: string) => profiles.find((p) => p.name === member)?.id;

  return (
    <HealthSubScreen
      title={h.allergy}
      subtitle={sp.allergySub}
      back="/suc-khoe"
      loading={isLoading}
      actionLabel={sp.updateAllergy}
      onAction={() => openForm({ type: "allergy" })}
      emptyTitle={sp.noAllergy}
      emptyDescription={sp.noAllergyDesc}
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
