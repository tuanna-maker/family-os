import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { colors } from "@mobile/theme/colors";

const LABELS: Record<string, string> = {
  "dat-xe-gia-dinh": "Đặt xe gia đình",
  "goi-uu-dai": "Gói dịch vụ ưu đãi",
};

export default function ComingSoonScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const title = (feature && LABELS[feature]) || "Đang phát triển";

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} back="/(tabs)/gia-dinh" />
      <Card style={styles.card}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.title}>Sắp ra mắt trên React Native</Text>
        <Text style={styles.sub}>
          Tính năng này vẫn dùng được trên app Capacitor hiện tại. Phiên bản native đang được port dần.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emoji: { fontSize: 40 },
  title: { fontSize: 18, fontWeight: "800", color: colors.foreground, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
});
