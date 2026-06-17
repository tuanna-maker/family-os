import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listChildren, toggleHomework } from "@mobile/api/children";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow } from "@mobile/theme/colors";

export default function ChildHomeworkListScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { colors } = useTheme();
  const styles = useStyles();
  const { locale, s } = useI18n();
  const ch = s.screens.children;
  const c = s.common;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const toggleMut = useMutation({
    mutationFn: (data: { id: string; done: boolean }) => toggleHomework(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["children", familyId] }),
  });

  const child = q.data?.children.find((x) => x.id === childId);
  const homeworks = (q.data?.homeworks ?? []).filter((h) => h.child_id === childId);
  const title = child ? `${ch.homework} · ${child.name}` : ch.homework;

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
            accessibilityLabel={ch.form.addHomework}
            onPress={() => router.push(`/con-cai/them?type=homework&childId=${childId ?? ""}`)}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      {q.isLoading ? <LoadingState /> : null}

      {!q.isLoading && homeworks.length === 0 ? (
        <EmptyState
          title={ch.noHomework}
          actionLabel={ch.form.addHomework}
          onAction={() => router.push(`/con-cai/them?type=homework&childId=${childId ?? ""}`)}
        />
      ) : (
        homeworks.map((hw) => (
          <Card key={hw.id} style={styles.row}>
            <Pressable
              style={[styles.check, hw.done && styles.checkDone]}
              onPress={() => toggleMut.mutate({ id: hw.id, done: !hw.done })}
            >
              {hw.done ? <Check color={colors.white} size={14} /> : null}
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push(`/con-cai/them?type=homework&id=${hw.id}&childId=${childId}`)}
            >
              <Text style={[styles.title, hw.done && styles.doneText]} numberOfLines={1}>
                {hw.title || hw.subject}
              </Text>
              <Text style={styles.sub}>
                {hw.subject}
                {hw.due_date ? ` · ${formatDate(hw.due_date, locale)}` : ""}
              </Text>
            </Pressable>
          </Card>
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
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    checkDone: { backgroundColor: c.success, borderColor: c.success },
    title: { fontWeight: "700" as const, fontSize: 15 * fontScale, color: c.foreground },
    doneText: { textDecorationLine: "line-through" as const, color: c.muted },
    sub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
  }));
}
