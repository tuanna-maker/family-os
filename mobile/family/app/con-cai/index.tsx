import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
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

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function ConCaiScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useConCaiStyles();
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
    if (selectedChild && q.data.children.some((c) => c.id === selectedChild)) return selectedChild;
    return q.data.children[0]?.id ?? null;
  }, [q.data, selectedChild]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["children", familyId] });

  const hwMut = useMutation({ mutationFn: toggleHomework, onSuccess: invalidate });
  const rmMut = useMutation({ mutationFn: toggleReminder, onSuccess: invalidate });
  const delMut = useMutation({
    mutationFn: deleteChildrenRow,
    onSuccess: () => {
      toast.success("Đã xoá");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const childHw = (q.data?.homeworks ?? []).filter((h) => h.child_id === activeChildId);
  const allReminders = q.data?.reminders ?? [];
  const childNameById = useMemo(() => {
    const m = new Map<string, string>();
    (q.data?.children ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [q.data?.children]);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Family Core" title="Đồng hành cùng con" back="/(tabs)/gia-dinh" />

      {(famLoading || q.isLoading) && <LoadingState />}
      {q.isError && <ErrorState message={(q.error as Error).message} />}
      {!famLoading && !familyId && <EmptyState title="Chưa có hộ gia đình" />}

      {q.data && familyId && (
        <>
          <SectionHeader title="Các con" onAction={() => router.push("/con-cai/them?type=child")} />
          {q.data.children.length === 0 ? (
            <EmptyState title="Chưa có hồ sơ con" description="Thêm bé để bắt đầu theo dõi" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.childRow}>
                {q.data.children.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedChild(c.id)}
                    style={[styles.childChip, activeChildId === c.id && styles.childChipActive]}
                  >
                    <Text style={styles.childEmoji}>{c.avatar || "🧒"}</Text>
                    <Text style={[styles.childName, activeChildId === c.id && styles.childNameActive]}>{c.name}</Text>
                    <Text style={[styles.childGrade, activeChildId === c.id && styles.childGradeActive]}>
                      {c.grade || c.school || "—"}
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
              <Text style={styles.link}>Sửa hồ sơ</Text>
            </Pressable>
          )}

          <SectionHeader
            title="Thời khoá biểu"
            onAction={() => router.push(`/con-cai/them?type=schedule&childId=${activeChildId ?? ""}`)}
          />
          {(q.data.schedules ?? []).filter((s) => s.child_id === activeChildId).length === 0 ? (
            <Text style={styles.muted}>Chưa có lịch học.</Text>
          ) : (
            (q.data.schedules ?? [])
              .filter((s) => s.child_id === activeChildId)
              .map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/con-cai/them?type=schedule&id=${s.id}&childId=${activeChildId}`)}
                >
                  <Card style={styles.listRow}>
                    <Text style={styles.badge}>{DAYS[s.day_of_week] ?? "?"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{s.subject}</Text>
                      <Text style={styles.muted}>{s.time_start?.slice(0, 5) ?? "—"}</Text>
                    </View>
                  </Card>
                </Pressable>
              ))
          )}

          <SectionHeader
            title="Bài tập về nhà"
            onAction={() => router.push(`/con-cai/them?type=homework&childId=${activeChildId ?? ""}`)}
          />
          {childHw.length === 0 ? (
            <Text style={styles.muted}>Chưa có bài tập.</Text>
          ) : (
            childHw.map((h) => (
              <Card key={h.id} style={styles.listRow}>
                <Pressable onPress={() => hwMut.mutate({ id: h.id, done: !h.done })} style={styles.check}>
                  {h.done ? <Check color={colors.success} size={18} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, h.done && styles.done]}>{h.title}</Text>
                  <Text style={styles.muted}>
                    {h.subject}
                    {h.due_date ? ` · ${h.due_date}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert("Xóa?", h.title, [
                      { text: "Huỷ", style: "cancel" },
                      { text: "Xóa", style: "destructive", onPress: () => delMut.mutate({ table: "homeworks", id: h.id }) },
                    ])
                  }
                >
                  <Trash2 color={colors.emergency} size={16} />
                </Pressable>
              </Card>
            ))
          )}

          <SectionHeader
            title="Thành tích"
            onAction={() => router.push(`/con-cai/them?type=achievement&childId=${activeChildId ?? ""}`)}
          />
          {(q.data.achievements ?? []).filter((a) => a.child_id === activeChildId).length === 0 ? (
            <Text style={styles.muted}>Chưa có thành tích.</Text>
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
                      <Text style={styles.muted}>{a.earned_at}</Text>
                    </View>
                  </Card>
                </Pressable>
              ))
          )}

          <SectionHeader title="Nhắc phụ huynh" onAction={() => router.push("/con-cai/them?type=reminder")} />
          {allReminders.length === 0 ? (
            <Text style={styles.muted}>Chưa có lời nhắc.</Text>
          ) : (
            allReminders.map((r) => (
              <Card key={r.id} style={styles.listRow}>
                <Pressable onPress={() => rmMut.mutate({ id: r.id, done: !r.done })} style={styles.check}>
                  {r.done ? <Check color={colors.success} size={18} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, r.done && styles.done]}>{r.title}</Text>
                  <Text style={styles.muted}>
                    {new Date(r.remind_at).toLocaleString("vi-VN")}
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
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.muted,
      backgroundColor: c.surfaceElevated,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    rowTitle: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    done: { textDecorationLine: "line-through" as const, color: c.muted },
    muted: { fontSize: 12 * fontScale, color: c.muted },
    badge: { fontWeight: "800" as const, color: c.brand, width: 28, fontSize: 13 * fontScale },
  }));
}
