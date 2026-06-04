import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { DateTimeField, toLocalIso } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listFamilyEvents,
  upsertFamilyEvent,
  type EventCategory,
  type EventScope,
  type FamilyEventRow,
} from "@mobile/api/family-events";

const CATS: { id: EventCategory; label: string; icon: string }[] = [
  { id: "school", label: "Học tập", icon: "🎒" },
  { id: "medical", label: "Y tế", icon: "🏥" },
  { id: "medication", label: "Thuốc", icon: "💊" },
  { id: "travel", label: "Du lịch", icon: "✈️" },
  { id: "family", label: "Gia đình", icon: "👨‍👩‍👧" },
  { id: "payment", label: "Thanh toán", icon: "💳" },
];

const SCOPES: { id: EventScope; label: string }[] = [
  { id: "all", label: "Cả nhà" },
  { id: "children", label: "Con cái" },
  { id: "elderly", label: "Ông bà" },
  { id: "health", label: "Sức khỏe" },
  { id: "travel", label: "Du lịch" },
];

function rowToForm(row: FamilyEventRow) {
  return {
    title: row.title,
    category: row.category,
    scope: row.member_scope,
    memberName: row.member_name ?? "",
    startsAt: toLocalIso(new Date(row.starts_at)),
    location: row.location ?? "",
    remind: row.remind_minutes_before != null ? String(row.remind_minutes_before) : "15",
    notes: row.notes ?? "",
  };
}

export default function SuaSuKienScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["family-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const row = q.data?.find((e) => e.id === eventId);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("family");
  const [scope, setScope] = useState<EventScope>("all");
  const [memberName, setMemberName] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalIso(new Date()));
  const [location, setLocation] = useState("");
  const [remind, setRemind] = useState("15");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!row) return;
    const f = rowToForm(row);
    setTitle(f.title);
    setCategory(f.category);
    setScope(f.scope);
    setMemberName(f.memberName);
    setStartsAt(f.startsAt);
    setLocation(f.location);
    setRemind(f.remind);
    setNotes(f.notes);
  }, [row]);

  const mut = useMutation({
    mutationFn: () =>
      upsertFamilyEvent({
        id: eventId,
        family_id: familyId!,
        title,
        category,
        member_scope: scope,
        member_name: memberName || null,
        starts_at: new Date(startsAt).toISOString(),
        location: location || null,
        remind_minutes_before: remind ? Number(remind) : null,
        notes: notes || null,
        all_day: false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-events", familyId] });
      router.back();
    },
    onError: (e: Error) => Alert.alert("Lỗi", e.message),
  });

  if (q.isLoading || !familyId) return <Screen><LoadingState /></Screen>;
  if (!row) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title="Sửa sự kiện" back="/lich-gia-dinh" />
        <Text style={{ color: colors.muted }}>Không tìm thấy sự kiện.</Text>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Lịch gia đình" title="Sửa sự kiện" back="/lich-gia-dinh" />

      <TextField label="Tiêu đề" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Loại sự kiện</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {CATS.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, category === c.id && styles.chipActive]}
              onPress={() => setCategory(c.id)}
            >
              <Text>{c.icon}</Text>
              <Text style={[styles.chipText, category === c.id && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Phạm vi</Text>
      <View style={styles.chipsWrap}>
        {SCOPES.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.chip, scope === s.id && styles.chipActive]}
            onPress={() => setScope(s.id)}
          >
            <Text style={[styles.chipText, scope === s.id && styles.chipTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <TextField label="Tên (tuỳ chọn)" value={memberName} onChangeText={setMemberName} />
      <DateTimeField label="Bắt đầu" value={startsAt} onChange={setStartsAt} />
      <TextField label="Địa điểm" value={location} onChangeText={setLocation} />
      <TextField label="Nhắc trước (phút)" value={remind} onChangeText={setRemind} keyboardType="numeric" />
      <TextField label="Ghi chú" value={notes} onChangeText={setNotes} multiline />

      <PrimaryButton
        label="Lưu thay đổi"
        onPress={() => mut.mutate()}
        disabled={!title.trim() || mut.isPending}
        loading={mut.isPending}
      />
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 },
  chips: { flexDirection: "row", gap: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: { backgroundColor: colors.tintBlue, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: colors.brand },
});
