import { Text } from "react-native";
import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";

export default function HoatDongScreen() {
  const styles = useHintStyles();
  const { s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, activity, usingPilot } = useHealthOverview();

  return (
    <HealthSubScreen
      title={sp.recentActivity}
      subtitle={sp.activitySub}
      loading={isLoading}
      emptyTitle={sp.noActivity}
      emptyDescription={sp.noActivityDesc}
      items={activity.map((a, i) => ({
        id: `act-${i}`,
        emoji: a.emoji,
        title: a.text,
        meta: a.time,
      }))}
      footer={usingPilot ? <Text style={styles.hint}>{h.overview.pilotHint}</Text> : null}
    />
  );
}

function useHintStyles() {
  return useThemedStyles((c, fontScale) => ({
    hint: {
      fontSize: 11 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
      marginTop: 8,
      fontStyle: "italic" as const,
    },
  }));
}
