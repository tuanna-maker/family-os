import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState } from "@mobile/components/states";
import { colors } from "@mobile/theme/colors";
import { getTripBundle, toggleTripItem, upsertTripItem } from "@mobile/api/trips";
import { toast } from "@mobile/utils/toast";

export default function DuLichDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState("");

  const q = useQuery({
    queryKey: ["trip-bundle", tripId],
    queryFn: () => getTripBundle({ trip_id: tripId! }),
    enabled: !!tripId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip-bundle", tripId] });

  const addItem = useMutation({
    mutationFn: () =>
      upsertTripItem({
        trip_id: tripId,
        kind: "checklist",
        label: newLabel.trim(),
        done: false,
      }),
    onSuccess: () => {
      setNewLabel("");
      invalidate();
      toast.success("Đã thêm mục");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({ mutationFn: toggleTripItem, onSuccess: invalidate });

  if (q.isLoading) return <Screen><LoadingState /></Screen>;
  const trip = q.data?.trip;
  const items = q.data?.items ?? [];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={trip?.title ?? "Chuyến đi"} back="/du-lich" />

      <Pressable style={styles.editLink} onPress={() => router.push(`/du-lich/sua/${tripId}`)}>
        <Pencil color={colors.brand} size={16} />
        <Text style={styles.editText}>Sửa thông tin chuyến đi</Text>
      </Pressable>

      <Card style={{ marginBottom: 16 }}>
        <Text style={styles.dest}>{trip?.destination ?? "—"}</Text>
        <Text style={styles.meta}>{trip?.start_date} → {trip?.end_date}</Text>
      </Card>

      <SectionHeader title="Thêm checklist" />
      <TextField label="Nội dung" value={newLabel} onChangeText={setNewLabel} placeholder="Đặt vé máy bay" />
      <PrimaryButton label="Thêm" onPress={() => addItem.mutate()} disabled={!newLabel.trim()} loading={addItem.isPending} />

      <SectionHeader title="Danh sách" />
      {items.map((item) => (
        <Card key={item.id} style={styles.row}>
          <Pressable onPress={() => toggleMut.mutate({ id: item.id, done: !item.done })} style={styles.check}>
            {item.done ? <Check color={colors.success} size={16} /> : null}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, item.done && styles.done]}>{item.label}</Text>
            <Text style={styles.kind}>{item.kind}</Text>
          </View>
        </Card>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  editLink: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  editText: { color: colors.brand, fontWeight: "700" },
  dest: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontWeight: "600", color: colors.foreground },
  kind: { fontSize: 10, color: colors.muted },
  done: { textDecorationLine: "line-through", color: colors.muted },
});
