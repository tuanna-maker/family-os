import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteTrip,
  deleteTripItem,
  getTripBundle,
  listTrips,
  toggleTripItem,
} from "@mobile/api/trips";
import { toast } from "@mobile/utils/toast";

const STATUS: Record<string, string> = {
  planning: "Đang lên kế hoạch",
  upcoming: "Sắp đi",
  ongoing: "Đang đi",
  done: "Đã xong",
};

function formatVnd(n: number) {
  return `${(n ?? 0).toLocaleString("vi-VN")}đ`;
}

export default function DuLichScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tripsQ = useQuery({
    queryKey: ["family-trips", familyId],
    queryFn: () => listTrips({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const trips = tripsQ.data ?? [];
  const activeId = selectedId ?? trips[0]?.id ?? null;

  const bundleQ = useQuery({
    queryKey: ["trip-bundle", activeId],
    queryFn: () => getTripBundle({ trip_id: activeId! }),
    enabled: !!activeId,
  });

  const selected = useMemo(() => trips.find((t) => t.id === activeId), [trips, activeId]);
  const items = bundleQ.data?.items ?? [];
  const checklist = items.filter((i) => i.kind === "checklist");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["family-trips"] });
    qc.invalidateQueries({ queryKey: ["trip-bundle"] });
  };

  const toggleMut = useMutation({ mutationFn: toggleTripItem, onSuccess: invalidate });
  const delTripMut = useMutation({
    mutationFn: (id: string) => deleteTrip({ id }),
    onSuccess: () => {
      toast.success("Đã xóa chuyến đi");
      setSelectedId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteTripItem({ id }),
    onSuccess: invalidate,
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Family Core"
        title="Cả nhà du lịch"
        back="/(tabs)/gia-dinh"
      />

      <Pressable style={styles.addTrip} onPress={() => router.push("/du-lich/them")}>
        <Plus color={colors.white} size={18} />
        <Text style={styles.addTripText}>Chuyến đi mới</Text>
      </Pressable>

      {tripsQ.isLoading && <LoadingState />}
      {trips.length === 0 && !tripsQ.isLoading && (
        <EmptyState title="Chưa có chuyến đi" description="Tạo kế hoạch du lịch đầu tiên" />
      )}

      {trips.length > 0 && (
        <>
          <View style={styles.tripTabs}>
            {trips.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setSelectedId(t.id)}
                style={[styles.tripTab, activeId === t.id && styles.tripTabActive]}
              >
                <Text style={[styles.tripTabText, activeId === t.id && styles.tripTabTextActive]} numberOfLines={1}>
                  {t.title}
                </Text>
              </Pressable>
            ))}
          </View>

          {selected && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={styles.tripTitle}>{selected.title}</Text>
              <Text style={styles.muted}>
                {selected.destination ?? "—"} · {STATUS[selected.status] ?? selected.status}
              </Text>
              <Text style={styles.muted}>
                {selected.start_date ?? "?"} → {selected.end_date ?? "?"} · Ngân sách {formatVnd(selected.budget_planned)}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={() => router.push(`/du-lich/${selected.id}`)}>
                  <Text style={styles.link}>Chi tiết & mục</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("Xóa chuyến đi?", selected.title, [
                      { text: "Huỷ", style: "cancel" },
                      { text: "Xóa", style: "destructive", onPress: () => delTripMut.mutate(selected.id) },
                    ])
                  }
                >
                  <Trash2 color={colors.emergency} size={16} />
                </Pressable>
              </View>
            </Card>
          )}

          <SectionHeader title="Checklist" />
          {checklist.length === 0 ? (
            <Text style={styles.muted}>Chưa có mục — thêm trong chi tiết chuyến đi.</Text>
          ) : (
            checklist.map((item) => (
              <Card key={item.id} style={styles.checkRow}>
                <Pressable onPress={() => toggleMut.mutate({ id: item.id, done: !item.done })} style={styles.check}>
                  {item.done ? <Check color={colors.success} size={16} /> : null}
                </Pressable>
                <Text style={[styles.checkLabel, item.done && styles.done]}>{item.label}</Text>
                <Pressable onPress={() => delItemMut.mutate(item.id)}>
                  <Trash2 color={colors.muted} size={14} />
                </Pressable>
              </Card>
            ))
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addTrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brandDeep,
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  addTripText: { color: colors.white, fontWeight: "700" },
  tripTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  tripTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxWidth: "48%",
  },
  tripTabActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  tripTabText: { fontWeight: "600", color: colors.foreground },
  tripTabTextActive: { color: colors.white },
  tripTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  muted: { fontSize: 12, color: colors.muted, marginTop: 4 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" },
  link: { color: colors.brand, fontWeight: "700" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { flex: 1, fontWeight: "600", color: colors.foreground },
  done: { textDecorationLine: "line-through", color: colors.muted },
});
