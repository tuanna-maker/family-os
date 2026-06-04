import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState, ErrorState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteChildrenRow,
  listChildren,
  toggleHomework,
  toggleReminder,
} from "@mobile/api/children";
import { toast } from "@mobile/utils/toast";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function ConCaiScreen() {
  const router = useRouter();
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
  const childRm = (q.data?.reminders ?? []).filter((r) => r.child_id === activeChildId || !r.child_id);

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
                    <Text style={styles.childGrade}>{c.grade || c.school || "—"}</Text>
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
              <Text style={{ color: colors.brand, fontWeight: "600" }}>Sửa hồ sơ</Text>
            </Pressable>
          )}

          <SectionHeader
            title="Bài tập"
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
                  <Text style={styles.muted}>{h.subject}{h.due_date ? ` · ${h.due_date}` : ""}</Text>
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
            title="Nhắc nhở"
            onAction={() => router.push(`/con-cai/them?type=reminder&childId=${activeChildId ?? ""}`)}
          />
          {childRm.slice(0, 8).map((r) => (
            <Card key={r.id} style={styles.listRow}>
              <Pressable onPress={() => rmMut.mutate({ id: r.id, done: !r.done })} style={styles.check}>
                {r.done ? <Check color={colors.success} size={18} /> : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, r.done && styles.done]}>{r.title}</Text>
                <Text style={styles.muted}>{new Date(r.remind_at).toLocaleString("vi-VN")}</Text>
              </View>
            </Card>
          ))}

          <SectionHeader title="Thời khoá biểu" />
          {(q.data.schedules ?? [])
            .filter((s) => s.child_id === activeChildId)
            .map((s) => (
              <Card key={s.id} style={styles.listRow}>
                <Text style={styles.badge}>{DAYS[s.day_of_week] ?? "?"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.subject}</Text>
                  <Text style={styles.muted}>{s.time_start?.slice(0, 5) ?? "—"}</Text>
                </View>
              </Card>
            ))}
          <View style={{ height: 32 }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  childRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  childChip: {
    width: 90,
    alignItems: "center",
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  childChipActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  childEmoji: { fontSize: 24 },
  childName: { fontSize: 12, fontWeight: "700", color: colors.foreground, marginTop: 4 },
  childNameActive: { color: colors.white },
  childGrade: { fontSize: 10, color: colors.muted },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontWeight: "700", color: colors.foreground },
  done: { textDecorationLine: "line-through", color: colors.muted },
  muted: { fontSize: 12, color: colors.muted },
  badge: { fontWeight: "800", color: colors.brand, width: 28 },
});
