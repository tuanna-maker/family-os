import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Pencil, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { MonthCalendar, isSameCalendarDay } from "@mobile/components/calendar/MonthCalendar";
import { PageHeader } from "@mobile/components/ui";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate, formatTime } from "@mobile/i18n/format";
import {
  deleteFamilyEvent,
  listFamilyEvents,
  type EventCategory,
  type FamilyEventRow,
} from "@mobile/api/family-events";

const EVENT_CAT_META: Record<
  EventCategory,
  { icon: string; accent: keyof import("@mobile/theme/palettes").AppColors; bar: keyof import("@mobile/theme/palettes").AppColors }
> = {
  school: { icon: "🎒", accent: "pink", bar: "warning" },
  medical: { icon: "🏥", accent: "emergency", bar: "emergency" },
  medication: { icon: "💊", accent: "success", bar: "success" },
  travel: { icon: "✈️", accent: "warning", bar: "warning" },
  family: { icon: "👨‍👩‍👧", accent: "pink", bar: "brand" },
  payment: { icon: "💳", accent: "brand", bar: "brand" },
};

export default function LichGiaDinhScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const cal = s.screens.calendar;
  const c = s.common;
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

  const dayHeaderLabel = formatDate(selectedDate, locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={c.familyLabel} title={cal.title} back="/(tabs)/gia-dinh" />

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
            {dayHeaderLabel}
          </Text>
        </View>
        <Text style={styles.dayCount}>{cal.eventsCount(dayEvents.length)}</Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
      ) : dayEvents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{cal.noEventsToday}</Text>
          <Pressable onPress={() => router.push({ pathname: "/lich-gia-dinh/them", params: { date: dateParam } })}>
            <Text style={styles.addLink}>{cal.addEventLink}</Text>
          </Pressable>
        </View>
      ) : (
        dayEvents.map((ev) => (
          <EventCard
            key={ev.id}
            ev={ev}
            locale={locale}
            eventTypes={cal.eventTypes}
            onEdit={() => router.push(`/lich-gia-dinh/sua/${ev.id}`)}
            onDelete={() => {
              appAlert(cal.deleteEvent, ev.title, [
                { text: c.cancel, style: "cancel" },
                { text: c.delete, style: "destructive", onPress: () => delMut.mutate(ev.id) },
              ]);
            }}
            editA11y={c.edit}
            deleteA11y={c.delete}
          />
        ))
      )}
    </Screen>
  );
}

function EventCard({
  ev,
  locale,
  eventTypes,
  onEdit,
  onDelete,
  editA11y,
  deleteA11y,
}: {
  ev: FamilyEventRow;
  locale: import("@mobile/hooks/useAppPrefs").AppLocale;
  eventTypes: (typeof import("@mobile/i18n/strings").STRINGS)["vi"]["screens"]["calendar"]["eventTypes"];
  onEdit: () => void;
  onDelete: () => void;
  editA11y: string;
  deleteA11y: string;
}) {
  const { colors } = useTheme();
  const catMeta = EVENT_CAT_META[ev.category] ?? EVENT_CAT_META.family;
  const catLabel = eventTypes[ev.category] ?? eventTypes.family;
  const barColor = colors[catMeta.bar];
  const time = formatTime(ev.starts_at, locale);
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
            {catMeta.icon} {ev.title}
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
          {catLabel}
          {ev.member_name ? ` · ${ev.member_name}` : ""}
        </Text>
        {ev.notes ? (
          <Text style={s.eventMeta} numberOfLines={2}>
            {ev.notes}
          </Text>
        ) : null}
        <View style={s.eventActions}>
          <Pressable style={s.actionBtn} onPress={onEdit} accessibilityLabel={editA11y}>
            <Pencil color={colors.foreground} size={16} />
          </Pressable>
          <Pressable style={s.actionBtn} onPress={onDelete} accessibilityLabel={deleteA11y}>
            <Trash2 color={colors.emergency} size={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
