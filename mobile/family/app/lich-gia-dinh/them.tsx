import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateTimeField, toLocalIso } from "@mobile/components/DateTimeField";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { upsertFamilyEvent, type EventCategory, type EventScope } from "@mobile/api/family-events";

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

function defaultStartsAt(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T09:00:00`) : new Date();
  if (!dateStr) d.setHours(9, 0, 0, 0);
  return toLocalIso(d);
}

export default function ThemSuKienScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(() => ({
    chips: { flexDirection: "row" as const, gap: 8 },
    chipsWrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 16 },
  }));
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("family");
  const [scope, setScope] = useState<EventScope>("all");
  const [memberName, setMemberName] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStartsAt(typeof date === "string" ? date : undefined));
  const [location, setLocation] = useState("");
  const [remind, setRemind] = useState("15");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      upsertFamilyEvent({
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

  if (!familyId) {
    return (
      <Screen>
        <Text style={{ color: colors.muted }}>Đang tải gia đình…</Text>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Lịch gia đình" title="Thêm sự kiện" back="/lich-gia-dinh" />

      <TextField label="Tiêu đề" value={title} onChangeText={setTitle} placeholder="Bé Minh đi học" />

      <FieldLabel>Loại sự kiện</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {CATS.map((c) => (
            <SelectChip
              key={c.id}
              label={`${c.icon} ${c.label}`}
              active={category === c.id}
              onPress={() => setCategory(c.id)}
            />
          ))}
        </View>
      </ScrollView>

      <FieldLabel>Phạm vi</FieldLabel>
      <View style={styles.chipsWrap}>
        {SCOPES.map((s) => (
          <SelectChip key={s.id} label={s.label} active={scope === s.id} onPress={() => setScope(s.id)} />
        ))}
      </View>

      <TextField label="Tên (tuỳ chọn)" value={memberName} onChangeText={setMemberName} placeholder="Bé Minh" />
      <DateTimeField label="Bắt đầu" value={startsAt} onChange={setStartsAt} />
      <TextField label="Địa điểm" value={location} onChangeText={setLocation} placeholder="Trường…" />
      <TextField label="Nhắc trước (phút)" value={remind} onChangeText={setRemind} keyboardType="numeric" />
      <TextField label="Ghi chú" value={notes} onChangeText={setNotes} multiline />

      <PrimaryButton
        label={mut.isPending ? "Đang lưu…" : "Thêm sự kiện"}
        onPress={() => {
          if (!title.trim()) return;
          mut.mutate();
        }}
        disabled={!title.trim() || mut.isPending}
        loading={mut.isPending}
      />
      <View style={{ height: 32 }} />
    </Screen>
  );
}

