import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteFamilyEvent,
  listFamilyEvents,
  type EventCategory,
  type FamilyEventRow,
} from "@mobile/api/family-events";

const CATS: Record<EventCategory, { label: string; icon: string }> = {
  school: { label: "Học tập", icon: "🎒" },
  medical: { label: "Y tế", icon: "🏥" },
  medication: { label: "Thuốc", icon: "💊" },
  travel: { label: "Du lịch", icon: "✈️" },
  family: { label: "Gia đình", icon: "👨‍👩‍👧" },
  payment: { label: "Thanh toán", icon: "💳" },
};

export default function LichGiaDinhScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Date());

  const q = useQuery({
    queryKey: ["family-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFamilyEvent({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-events", familyId] }),
  });

  const dayEvents = useMemo(() => {
    const rows = q.data ?? [];
    return rows.filter((e) => isSameDay(new Date(e.starts_at), selected));
  }, [q.data, selected]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateParam = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Gia đình" title="Lịch gia đình" back="/(tabs)/gia-dinh" />

      <View style={styles.weekRow}>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(selected);
          d.setDate(selected.getDate() - selected.getDay() + 1 + i);
          const active = isSameDay(d, selected);
          return (
            <Pressable key={i} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => setSelected(d)}>
              <Text style={[styles.dayNum, active && styles.dayNumActive]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
      ) : dayEvents.length === 0 ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.empty}>Không có sự kiện trong ngày này.</Text>
        </Card>
      ) : (
        dayEvents.map((ev) => (
          <EventRow
            key={ev.id}
            ev={ev}
            onPress={() => router.push(`/lich-gia-dinh/sua/${ev.id}`)}
            onDelete={() => {
              Alert.alert("Xóa sự kiện?", ev.title, [
                { text: "Huỷ", style: "cancel" },
                { text: "Xóa", style: "destructive", onPress: () => delMut.mutate(ev.id) },
              ]);
            }}
          />
        ))
      )}

      <Pressable style={styles.fab} onPress={() => router.push({ pathname: "/lich-gia-dinh/them", params: { date: dateParam } })}>
        <Plus color={colors.white} size={24} />
      </Pressable>
    </Screen>
  );
}

function EventRow({
  ev,
  onPress,
  onDelete,
}: {
  ev: FamilyEventRow;
  onPress: () => void;
  onDelete: () => void;
}) {
  const cat = CATS[ev.category];
  const time = new Date(ev.starts_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.event}>
        <View style={styles.eventHead}>
          <Text style={styles.eventIcon}>{cat.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{ev.title}</Text>
            <Text style={styles.eventMeta}>
              {time} · {cat.label}
              {ev.member_name ? ` · ${ev.member_name}` : ""}
            </Text>
          </View>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Trash2 color={colors.emergency} size={18} />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  dayChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dayChipActive: { backgroundColor: colors.tintBlue, borderColor: colors.brand },
  dayNum: { fontWeight: "700", color: colors.muted },
  dayNumActive: { color: colors.brand },
  empty: { color: colors.muted, textAlign: "center" },
  event: { marginBottom: 10 },
  eventHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  eventIcon: { fontSize: 22 },
  eventTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  eventMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
