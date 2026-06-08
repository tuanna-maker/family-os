import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { useI18n } from "@mobile/i18n/useI18n";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

export default function ComingSoonScreen() {
  const { feature, back } = useLocalSearchParams<{ feature?: string; back?: string }>();
  const { s } = useI18n();
  const c = s.common;
  const cs = s.screens.comingSoon;
  const styles = useComingSoonStyles();

  const copyMap: Record<string, { title: string; description: string }> = {
    "dat-xe-gia-dinh": cs.datXe,
    "mua-sam-ho": cs.muaSam,
    "goi-uu-dai": cs.goiUuDai,
    "moi-thanh-vien": cs.moiThanhVien,
  };

  const copy = feature ? copyMap[feature] : undefined;
  const title = copy?.title ?? c.developing;
  const backHref = back ?? "/(tabs)/gia-dinh";

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} back={backHref} />
      <Card style={styles.card}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.heading}>{c.developing}</Text>
        <Text style={styles.sub}>{copy?.description ?? c.developingDesc}</Text>
      </Card>
    </Screen>
  );
}

function useComingSoonStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: { alignItems: "center" as const, paddingVertical: 32, gap: 8 },
    emoji: { fontSize: 40 },
    heading: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground, textAlign: "center" as const },
    sub: { fontSize: 14 * fontScale, color: c.muted, textAlign: "center" as const, lineHeight: 20 },
  }));
}
