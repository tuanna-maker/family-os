import { Pressable, Text, View } from "react-native";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { isSameCalendarDay } from "@mobile/components/calendar/MonthCalendar";
import { useI18n } from "@mobile/i18n/useI18n";
import { localeTag } from "@mobile/i18n/format";

export type WeekDayCell = {
  date: Date;
  iso: string;
  shiftCount: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse YYYY-MM-DD as local midnight (tránh lệch ngày khi dùng `new Date(iso)` UTC). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function formatViDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatViDateRange(from: string, to: string): string {
  return `${formatViDate(from)} - ${formatViDate(to)}`;
}

export function formatWeekDateRange(from: string, to: string, locale: "vi" | "en"): string {
  if (locale === "en") {
    const fmt = (iso: string) =>
      parseLocalDate(iso).toLocaleDateString(localeTag(locale), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    return `${fmt(from)} - ${fmt(to)}`;
  }
  return formatViDateRange(from, to);
}

/** Thứ 2 → Chủ nhật của tuần chứa `anchor` (mặc định hôm nay). */
export function getCurrentWeekRange(anchor = new Date()) {
  const today = new Date(anchor);
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: isoDate(monday), to: isoDate(sunday), monday, sunday };
}

export function buildWeekDays(fromIso: string, toIso: string): WeekDayCell[] {
  const start = parseLocalDate(fromIso);
  const end = parseLocalDate(toIso);
  const days: WeekDayCell[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({ date: new Date(cur), iso: isoDate(cur), shiftCount: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

type Props = {
  days: WeekDayCell[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  rangeFrom: string;
  rangeTo: string;
};

export function GuardWeekCalendar({ days, selectedDate, onSelectDate, rangeFrom, rangeTo }: Props) {
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const forms = s.security.forms;
  const weekdays = forms.weekdays;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const styles = useThemedStyles((c, fontScale) => ({
    wrap: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      marginBottom: 12,
    },
    title: {
      fontSize: 13 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      textAlign: "center" as const,
    },
    range: {
      fontSize: 12 * fontScale,
      fontWeight: "500" as const,
      color: c.muted,
      marginTop: 4,
      marginBottom: 10,
      textAlign: "center" as const,
    },
    row: { flexDirection: "row" as const },
    cell: { flex: 1, alignItems: "center" as const, paddingVertical: 4 },
    weekday: { fontSize: 11 * fontScale, fontWeight: "600" as const, color: c.muted, marginBottom: 6 },
    dayInner: {
      width: 40,
      height: 44,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    dayNum: { fontSize: 15 * fontScale, fontWeight: "700" as const },
    dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{forms.weekCalendarTitle}</Text>
      <Text style={styles.range}>{formatWeekDateRange(rangeFrom, rangeTo, locale)}</Text>
      <View style={styles.row}>
        {days.map((cell, i) => {
          const selected = isSameCalendarDay(cell.date, selectedDate);
          const isToday = isSameCalendarDay(cell.date, today);
          const hasShifts = cell.shiftCount > 0;
          const wd = weekdays[i] ?? weekdays[(cell.date.getDay() + 6) % 7];

          let bg = "transparent";
          let textColor = colors.foreground;
          let borderColor = "transparent";
          let borderWidth = 0;

          if (selected) {
            bg = colors.brand;
            textColor = colors.white;
          } else if (isToday) {
            borderColor = colors.brand;
            borderWidth = 2;
          }

          return (
            <Pressable key={cell.iso} style={styles.cell} onPress={() => onSelectDate(cell.date)}>
              <Text style={[styles.weekday, i === 6 && { color: colors.brand }]}>{wd}</Text>
              <View style={[styles.dayInner, { backgroundColor: bg, borderColor, borderWidth }]}>
                <Text style={[styles.dayNum, { color: textColor }]}>{cell.date.getDate()}</Text>
                {hasShifts ? (
                  <View
                    style={[styles.dot, { backgroundColor: selected ? colors.white : colors.success }]}
                  />
                ) : (
                  <View style={{ height: 8 }} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
