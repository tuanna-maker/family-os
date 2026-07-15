import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateTimeField, toLocalIso } from "@mobile/components/DateTimeField";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useI18n } from "@mobile/i18n/useI18n";
import { upsertFamilyEvent, type EventCategory, type EventScope } from "@mobile/api/family-events";

const EVENT_CAT_ICONS: Record<EventCategory, string> = {
  school: "🎒",
  medical: "🏥",
  medication: "💊",
  travel: "✈️",
  family: "👨‍👩‍👧",
  payment: "💳",
};

const EVENT_CATEGORIES: EventCategory[] = ["school", "medical", "medication", "travel", "family", "payment"];
const EVENT_SCOPES: EventScope[] = ["all", "children", "elderly", "health", "travel"];

function defaultStartsAt(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T09:00:00`) : new Date();
  if (!dateStr) d.setHours(9, 0, 0, 0);
  return toLocalIso(d);
}

export default function ThemSuKienScreen() {
  const { colors } = useTheme();
  const { s } = useI18n();
  const cal = s.screens.calendar;
  const c = s.common;
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
    onError: (e: Error) => appAlert(c.error, e.message),
  });

  if (!familyId) {
    return (
      <Screen>
        <Text style={{ color: colors.muted }}>{cal.loadingFamily}</Text>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={cal.eyebrow} title={cal.add} back="/lich-gia-dinh" />

      <TextField label={cal.eventTitle} value={title} onChangeText={setTitle} placeholder={cal.titlePh} />

      <FieldLabel>{cal.eventTypeLabel}</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {EVENT_CATEGORIES.map((id) => (
            <SelectChip
              key={id}
              label={`${EVENT_CAT_ICONS[id]} ${cal.eventTypes[id]}`}
              active={category === id}
              onPress={() => setCategory(id)}
            />
          ))}
        </View>
      </ScrollView>

      <FieldLabel>{cal.scopeLabel}</FieldLabel>
      <View style={styles.chipsWrap}>
        {EVENT_SCOPES.map((id) => (
          <SelectChip key={id} label={cal.groups[id]} active={scope === id} onPress={() => setScope(id)} />
        ))}
      </View>

      <TextField label={cal.memberOptional} value={memberName} onChangeText={setMemberName} placeholder={cal.memberPh} />
      <DateTimeField label={cal.startsAt} value={startsAt} onChange={setStartsAt} />
      <TextField label={cal.eventPlace} value={location} onChangeText={setLocation} placeholder={cal.locationPh} />
      <TextField label={cal.remindBefore} value={remind} onChangeText={setRemind} keyboardType="numeric" />
      <TextField label={cal.eventNotes} value={notes} onChangeText={setNotes} multiline />

      <PrimaryButton
        label={mut.isPending ? cal.saving : cal.add}
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
