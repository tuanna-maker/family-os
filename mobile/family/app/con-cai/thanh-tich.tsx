import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trophy } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listChildren } from "@mobile/api/children";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow } from "@mobile/theme/colors";

export default function ChildAchievementsListScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { colors } = useTheme();
  const styles = useStyles();
  const { locale, s } = useI18n();
  const ch = s.screens.children;
  const { familyId } = useFamilyContext();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const child = q.data?.children.find((x) => x.id === childId);
  const achievements = (q.data?.achievements ?? []).filter((a) => a.child_id === childId);
  const title = child ? `${ch.achievements} · ${child.name}` : ch.achievements;

  if (!familyId) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow={ch.title}
        title={title}
        back="/con-cai"
        right={
          <HeaderIconButton
            variant="primary"
            accessibilityLabel={ch.form.addAchievement}
            onPress={() => router.push(`/con-cai/them?type=achievement&childId=${childId ?? ""}`)}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      {q.isLoading ? <LoadingState /> : null}

      {!q.isLoading && achievements.length === 0 ? (
        <EmptyState
          title={ch.noAchievements}
          actionLabel={ch.form.addAchievement}
          onAction={() => router.push(`/con-cai/them?type=achievement&childId=${childId ?? ""}`)}
        />
      ) : (
        achievements.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/con-cai/them?type=achievement&id=${item.id}&childId=${childId}`)}
          >
            <Card style={styles.row}>
              <View style={styles.iconWrap}>
                <Trophy color={colors.warning} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.sub}>{formatDate(item.earned_at, locale)}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      marginBottom: 10,
      ...cardShadow(c),
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.tintOrange,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: { fontWeight: "700" as const, fontSize: 15 * fontScale, color: c.foreground },
    sub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
  }));
}
