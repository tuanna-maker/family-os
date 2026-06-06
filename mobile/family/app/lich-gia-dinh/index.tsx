import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Pencil, Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { MonthCalendar, isSameCalendarDay } from "@mobile/components/calendar/MonthCalendar";
import { HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteFamilyEvent,
  listFamilyEvents,
  type EventCategory,
  type FamilyEventRow,
} from "@mobile/api/family-events";

const CATS: Record<
  EventCategory,
  { label: string; icon: string; accent: keyof import("@mobile/theme/palettes").AppColors; bar: keyof import("@mobile/theme/palettes").AppColors }
> = {
  school: { label: "Học tập", icon: "🎒", accent: "pink", bar: "warning" },
  medical: { label: "Y tế", icon: "🏥", accent: "emergency", bar: "emergency" },
  medication: { label: "Thuốc", icon: "💊", accent: "success", bar: "success" },
  travel: { label: "Du lịch", icon: "✈️", accent: "warning", bar: "warning" },
  family: { label: "Gia đình", icon: "👨‍👩‍👧", accent: "pink", bar: "brand" },
  payment: { label: "Thanh toán", icon: "💳", accent: "brand", bar: "brand" },
};

function fmtDayHeader(d: Date) {
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function LichGiaDinhScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [viewDate, setViewDate] = useState(() => new Date());

  const styles = useThemedStyles((c, fontScale) => ({
    section: { marginTop: 16 },
    dayHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: 20,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    dayHeaderLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flex: 1 },
    dayTitle: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground, flexShrink: 1 },
    dayCount: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.brand },
    empty: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 24,
      alignItems: "center" as const,
    },
    emptyText: { color: c.muted, fontSize: 14 * fontScale, textAlign: "center" as const },
    addLink: { color: c.brand, fontWeight: "700" as const, marginTop: 12, fontSize: 14 * fontScale },
  }));

  const q = useQuery({
    queryKey: ["family-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFamilyEvent({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-events", familyId] }),
  });

  const events = q.data ?? [];

  const eventCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const k = new Date(e.starts_at).toDateString();
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => isSameCalendarDay(new Date(e.starts_at), selectedDate))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events, selectedDate],
  );

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateParam = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;

  const onChangeMonth = (year: number, month: number) => {
    setViewDate(new Date(year, month, 1));
  };

  const onSelectDate = (d: Date) => {
    const next = new Date(d);
    next.setHours(0, 0, 0, 0);
    setSelectedDate(next);
    if (d.getMonth() !== viewDate.getMonth() || d.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Gia đình"
        title="Lịch gia đình"
        back="/(tabs)/gia-dinh"
        right={
          <HeaderIconButton
            variant="primary"
            accessibilityLabel="Thêm sự kiện"
            onPress={() => router.push({ pathname: "/lich-gia-dinh/them", params: { date: dateParam } })}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      <MonthCalendar
        viewDate={viewDate}
        selectedDate={selectedDate}
        eventCountByDay={eventCountByDay}
        onSelectDate={onSelectDate}
        onChangeMonth={onChangeMonth}
      />

      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <Calendar color={colors.brand} size={20} />
          <Text style={styles.dayTitle} numberOfLines={2}>
            {fmtDayHeader(selectedDate)}
          </Text>
        </View>
        <Text style={styles.dayCount}>
          {dayEvents.length} sự kiện
        </Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
      ) : dayEvents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Không có sự kiện trong ngày này.</Text>
          <Pressable onPress={() => router.push({ pathname: "/lich-gia-dinh/them", params: { date: dateParam } })}>
            <Text style={styles.addLink}>+ Thêm sự kiện</Text>
          </Pressable>
        </View>
      ) : (
        dayEvents.map((ev) => (
          <EventCard
            key={ev.id}
            ev={ev}
            onEdit={() => router.push(`/lich-gia-dinh/sua/${ev.id}`)}
            onDelete={() => {
              Alert.alert("Xóa sự kiện?", ev.title, [
                { text: "Huỷ", style: "cancel" },
                { text: "Xóa", style: "destructive", onPress: () => delMut.mutate(ev.id) },
              ]);
            }}
          />
        ))
      )}

    </Screen>
  );
}

function EventCard({
  ev,
  onEdit,
  onDelete,
}: {
  ev: FamilyEventRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const cat = CATS[ev.category] ?? CATS.family;
  const barColor = colors[cat.bar];
  const time = fmtTime(ev.starts_at);
  const s = useThemedStyles((c, fontScale) => ({
    eventCard: {
      flexDirection: "row" as const,
      borderRadius: radius.lg,
      backgroundColor: c.tintOrange,
      marginBottom: 10,
      overflow: "hidden" as const,
    },
    eventBar: { width: 5 },
    eventBody: { flex: 1, padding: 14 },
    eventTop: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const, gap: 8 },
    eventTitle: { fontSize: 16 * fontScale, fontWeight: "800" as const, color: c.foreground, flex: 1 },
    eventTime: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.muted },
    locationPill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      alignSelf: "flex-start" as const,
      marginTop: 8,
      backgroundColor: c.tintBlue,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      maxWidth: "100%" as const,
    },
    locationText: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.brand, flexShrink: 1 },
    eventMeta: { fontSize: 12 * fontScale, color: c.muted, marginTop: 6 },
    eventActions: { flexDirection: "row" as const, gap: 8, marginTop: 10 },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }));

  return (
    <View style={s.eventCard}>
      <View style={[s.eventBar, { backgroundColor: barColor }]} />
      <View style={s.eventBody}>
        <View style={s.eventTop}>
          <Text style={s.eventTitle}>
            {cat.icon} {ev.title}
          </Text>
          <Text style={s.eventTime}>{time}</Text>
        </View>
        {ev.location ? (
          <View style={s.locationPill}>
            <MapPin color={colors.brand} size={12} />
            <Text style={s.locationText} numberOfLines={1}>
              {ev.location}
            </Text>
          </View>
        ) : null}
        <Text style={s.eventMeta}>
          {cat.label}
          {ev.member_name ? ` · ${ev.member_name}` : ""}
        </Text>
        {ev.notes ? (
          <Text style={s.eventMeta} numberOfLines={2}>
            {ev.notes}
          </Text>
        ) : null}
        <View style={s.eventActions}>
          <Pressable style={s.actionBtn} onPress={onEdit} accessibilityLabel="Sửa">
            <Pencil color={colors.foreground} size={16} />
          </Pressable>
          <Pressable style={s.actionBtn} onPress={onDelete} accessibilityLabel="Xóa">
            <Trash2 color={colors.emergency} size={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
