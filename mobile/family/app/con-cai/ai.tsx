import { useMemo } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { aiInsight } from "@mobile/api/ai-insight";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listChildren } from "@mobile/api/children";
import { useI18n } from "@mobile/i18n/useI18n";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function ChildAiAnalysisScreen() {
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { familyId } = useFamilyContext();
  const { s } = useI18n();
  const ch = s.screens.children;
  const styles = useStyles();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const child = q.data?.children.find((x) => x.id === childId);
  const title = child ? ch.aiTitle(child.name) : ch.aiTitle(ch.title);
  const icon = useMemo(() => require("../../assets/gemini-1781685677184-Photoroom.png"), []);

  const aiQ = useQuery({
    queryKey: ["ai-insight", "child", familyId, childId],
    queryFn: async () => {
      const name = child?.name ?? "bé";
      const prompt = [
        `Bạn là trợ lý đồng hành cùng con.`,
        `Hãy đưa ra 3-6 gợi ý ngắn gọn cho phụ huynh về ${name}.`,
        `Bối cảnh: ${ch.subtitle}`,
        `Gợi ý nên mang tính thực hành trong ngày (học tập, ngủ, thói quen).`,
      ].join("\n");
      const res = await aiInsight({ prompt });
      return res.text;
    },
    enabled: !!familyId,
    staleTime: 60_000,
  });

  if (!familyId || q.isLoading) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={ch.aiTitle("")} back="/con-cai" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} back="/con-cai" alignTitleWithContent />

      <Card style={styles.card}>
        <View style={styles.heroRow}>
          <View style={styles.iconWrap}>
            <Image source={icon} style={styles.icon} contentFit="contain" cachePolicy="memory-disk" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.head}>{ch.aiTitle(child?.name ?? "")}</Text>
            <Text style={styles.sub}>{ch.subtitle}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {aiQ.isLoading ? (
            <Text style={styles.bullet}>• Đang phân tích…</Text>
          ) : aiQ.isError ? (
            <>
              <Text style={styles.aiErr}>AI lỗi: {(aiQ.error as Error)?.message ?? "Không rõ lỗi"}</Text>
              {[ch.aiTip1, ch.aiTip2, ch.aiTip3].map((tip) => (
                <Text key={tip} style={styles.bullet}>
                  • {tip}
                </Text>
              ))}
            </>
          ) : aiQ.data ? (
            aiQ.data
              .split(/\n+/)
              .map((l) => l.replace(/^[•\-\s]+/, "").trim())
              .filter(Boolean)
              .slice(0, 8)
              .map((tip) => (
                <Text key={tip} style={styles.bullet}>
                  • {tip}
                </Text>
              ))
          ) : (
            [ch.aiTip1, ch.aiTip2, ch.aiTip3].map((tip) => (
              <Text key={tip} style={styles.bullet}>
                • {tip}
              </Text>
            ))
          )}
        </View>
      </Card>
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: { marginTop: 12 },
    heroRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    icon: { width: 30, height: 30 },
    head: { fontSize: 16 * fontScale, fontWeight: "800" as const, color: c.foreground },
    sub: { marginTop: 4, fontSize: 12 * fontScale, color: c.muted, fontWeight: "600" as const },
    list: { marginTop: 12, gap: 8 },
    bullet: { fontSize: 13 * fontScale, color: c.foreground, lineHeight: 20 },
    aiErr: { fontSize: 12 * fontScale, color: c.emergency, fontWeight: "700" as const, marginBottom: 6 },
  }));
}

