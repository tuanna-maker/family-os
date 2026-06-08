import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState, ErrorState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteChildrenRow,
  listChildren,
  toggleHomework,
  toggleReminder,
} from "@mobile/api/children";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate, formatDateTime } from "@mobile/i18n/format";
import { displayGrade } from "@mobile/utils/displayContent";

export default function ConCaiScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useConCaiStyles();
  const { locale, s } = useI18n();
  const ch = s.screens.children;
  const c = s.common;
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const activeChildId = useMemo(() => {
    if (!q.data) return null;
    if (selectedChild && q.data.children.some((child) => child.id === selectedChild)) return selectedChild;
    return q.data.children[0]?.id ?? null;
  }, [q.data, selectedChild]);

  type ChildrenData = Awaited<ReturnType<typeof listChildren>>;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["children", familyId] });

  const hwMut = useMutation({
    mutationFn: toggleHomework,
    onMutate: async ({ id, done }) => {
      if (!familyId) return;
      await qc.cancelQueries({ queryKey: ["children", familyId] });
      const prev = qc.getQueryData<ChildrenData>(["children", familyId]);
      qc.setQueryData<ChildrenData>(["children", familyId], (old) => {
        if (!old) return old;
        return {
          ...old,
          homeworks: old.homeworks.map((h) => (h.id === id ? { ...h, done } : h)),
        };
      });
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev && familyId) qc.setQueryData(["children", familyId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: invalidate,
  });

  const rmMut = useMutation({
    mutationFn: toggleReminder,
    onMutate: async ({ id, done }) => {
      if (!familyId) return;
      await qc.cancelQueries({ queryKey: ["children", familyId] });
      const prev = qc.getQueryData<ChildrenData>(["children", familyId]);
      qc.setQueryData<ChildrenData>(["children", familyId], (old) => {
        if (!old) return old;
        return {
          ...old,
          reminders: old.reminders.map((r) => (r.id === id ? { ...r, done } : r)),
        };
      });
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev && familyId) qc.setQueryData(["children", familyId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: invalidate,
  });
  const delMut = useMutation({
    mutationFn: deleteChildrenRow,
    onSuccess: () => {
      toast.success(c.deleted);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const childHw = (q.data?.homeworks ?? []).filter((h) => h.child_id === activeChildId);
  const allReminders = q.data?.reminders ?? [];
  const childNameById = useMemo(() => {
    const m = new Map<string, string>();
    (q.data?.children ?? []).forEach((child) => m.set(child.id, child.name));
    return m;
  }, [q.data?.children]);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={ch.eyebrow} title={ch.title} back="/(tabs)/gia-dinh" />

      {(famLoading || q.isLoading) && <LoadingState />}
      {q.isError && <ErrorState message={(q.error as Error).message} />}
      {!famLoading && !familyId && <EmptyState title={c.noFamily} />}

      {q.data && familyId && (
        <>
          <SectionHeader title={ch.childrenSection} onAction={() => router.push("/con-cai/them?type=child")} />
          {q.data.children.length === 0 ? (
            <EmptyState title={ch.empty} description={ch.addChildHint} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.childRow}>
                {q.data.children.map((child) => (
                  <Pressable
                    key={child.id}
                    onPress={() => setSelectedChild(child.id)}
                    style={[styles.childChip, activeChildId === child.id && styles.childChipActive]}
                  >
                    <Text style={styles.childEmoji}>{child.avatar || "🧒"}</Text>
                    <Text style={[styles.childName, activeChildId === child.id && styles.childNameActive]}>{child.name}</Text>
                    <Text style={[styles.childGrade, activeChildId === child.id && styles.childGradeActive]}>
                      {(() => {
                        const grade = displayGrade(child.grade, locale);
                        return grade !== "—" ? grade : child.school || "—";
                      })()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          {activeChildId && (
            <Pressable
              onPress={() => router.push(`/con-cai/them?type=child&id=${activeChildId}`)}
              style={{ alignSelf: "flex-end", marginBottom: 12 }}
            >
              <Text style={styles.link}>{ch.editProfile}</Text>
            </Pressable>
          )}

          <SectionHeader
            title={ch.schedule}
            onAction={() => router.push(`/con-cai/them?type=schedule&childId=${activeChildId ?? ""}`)}
          />
          {(q.data.schedules ?? []).filter((item) => item.child_id === activeChildId).length === 0 ? (
            <Text style={styles.muted}>{ch.noSchedule}</Text>
          ) : (
            (q.data.schedules ?? [])
              .filter((item) => item.child_id === activeChildId)
              .map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/con-cai/them?type=schedule&id=${item.id}&childId=${activeChildId}`)}
                >
                  <Card style={styles.listRow}>
                    <Text style={styles.badge}>{ch.dayAbbr[item.day_of_week] ?? "?"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.subject}</Text>
                      <Text style={styles.muted}>{item.time_start?.slice(0, 5) ?? "—"}</Text>
                    </View>
                  </Card>
                </Pressable>
              ))
          )}

          <SectionHeader
            title={ch.homework}
            onAction={() => router.push(`/con-cai/them?type=homework&childId=${activeChildId ?? ""}`)}
          />
          {childHw.length === 0 ? (
            <Text style={styles.muted}>{ch.noHomework}</Text>
          ) : (
            childHw.map((h) => (
              <Card key={h.id} style={styles.listRow}>
                <Pressable
                  onPress={() => hwMut.mutate({ id: h.id, done: !h.done })}
                  style={[styles.check, h.done && styles.checkOn]}
                  hitSlop={6}
                >
                  {h.done ? <Check color={colors.white} size={16} strokeWidth={3} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, h.done && styles.done]}>{h.title}</Text>
                  <Text style={styles.muted}>
                    {h.subject}
                    {h.due_date ? ` · ${formatDate(h.due_date, locale)}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    appAlert(`${c.delete}?`, h.title, [
                      { text: c.cancel, style: "cancel" },
                      { text: c.delete, style: "destructive", onPress: () => delMut.mutate({ table: "homeworks", id: h.id }) },
                    ])
                  }
                >
                  <Trash2 color={colors.emergency} size={16} />
                </Pressable>
              </Card>
            ))
          )}

          <SectionHeader
            title={ch.achievements}
            onAction={() => router.push(`/con-cai/them?type=achievement&childId=${activeChildId ?? ""}`)}
          />
          {(q.data.achievements ?? []).filter((a) => a.child_id === activeChildId).length === 0 ? (
            <Text style={styles.muted}>{ch.noAchievements}</Text>
          ) : (
            (q.data.achievements ?? [])
              .filter((a) => a.child_id === activeChildId)
              .map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => router.push(`/con-cai/them?type=achievement&id=${a.id}&childId=${activeChildId}`)}
                >
                  <Card style={styles.listRow}>
                    <Text style={{ fontSize: 18 }}>🏆</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                      <Text style={styles.muted}>{formatDate(a.earned_at, locale)}</Text>
                    </View>
                  </Card>
                </Pressable>
              ))
          )}

          <SectionHeader title={ch.parentReminders} onAction={() => router.push("/con-cai/them?type=reminder")} />
          {allReminders.length === 0 ? (
            <Text style={styles.muted}>{ch.noReminders}</Text>
          ) : (
            allReminders.map((r) => (
              <Card key={r.id} style={styles.listRow}>
                <Pressable
                  onPress={() => rmMut.mutate({ id: r.id, done: !r.done })}
                  style={[styles.check, r.done && styles.checkOn]}
                  hitSlop={6}
                >
                  {r.done ? <Check color={colors.white} size={16} strokeWidth={3} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, r.done && styles.done]}>{r.title}</Text>
                  <Text style={styles.muted}>
                    {formatDateTime(r.remind_at, locale)}
                    {r.child_id && childNameById.get(r.child_id) ? ` · ${childNameById.get(r.child_id)}` : ""}
                  </Text>
                </View>
              </Card>
            ))
          )}

          <View style={{ height: 32 }} />
        </>
      )}
    </Screen>
  );
}

function useConCaiStyles() {
  return useThemedStyles((c, fontScale) => ({
    childRow: { flexDirection: "row" as const, gap: 8, paddingBottom: 4 },
    childChip: {
      width: 90,
      alignItems: "center" as const,
      padding: 12,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      ...cardShadow(c),
    },
    childChipActive: { backgroundColor: c.brandDeep, borderColor: c.brandDeep },
    childEmoji: { fontSize: 24 },
    childName: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.foreground, marginTop: 4 },
    childNameActive: { color: c.white },
    childGrade: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    childGradeActive: { color: "rgba(255,255,255,0.85)" },
    link: { color: c.brand, fontWeight: "600" as const, fontSize: 13 * fontScale },
    listRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 8 },
    check: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    checkOn: {
      backgroundColor: c.success,
      borderColor: c.success,
    },
    rowTitle: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    done: { textDecorationLine: "line-through" as const, color: c.muted },
    muted: { fontSize: 12 * fontScale, color: c.muted },
    badge: { fontWeight: "800" as const, color: c.brand, width: 28, fontSize: 13 * fontScale },
  }));
}
