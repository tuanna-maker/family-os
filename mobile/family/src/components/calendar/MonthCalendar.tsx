import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatMonthYear } from "@mobile/i18n/format";

export type CalendarDayCell = {
  date: Date;
  inMonth: boolean;
};

export function buildMonthGrid(year: number, month: number): CalendarDayCell[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: CalendarDayCell[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  let next = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, next++), inMonth: false });
  }
  return cells;
}

export function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Props = {
  viewDate: Date;
  selectedDate: Date;
  eventCountByDay: Map<string, number>;
  onSelectDate: (d: Date) => void;
  onChangeMonth: (year: number, month: number) => void;
};

export function MonthCalendar({
  viewDate,
  selectedDate,
  eventCountByDay,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const cal = s.screens.calendar;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = buildMonthGrid(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const styles = useThemedStyles((c, fontScale) => ({
    wrap: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
    },
    nav: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 12,
      marginBottom: 12,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.tintBlue,
    },
    monthTitle: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground },
    weekdayRow: { flexDirection: "row" as const, marginBottom: 4 },
    weekday: {
      flex: 1,
      textAlign: "center" as const,
      fontSize: 12 * fontScale,
      fontWeight: "600" as const,
      color: c.muted,
      paddingVertical: 4,
    },
    weekdaySun: { color: c.brand },
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const },
    cell: {
      width: "14.2857%",
      paddingVertical: 2,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    dayInner: {
      width: "88%" as const,
      aspectRatio: 1,
      maxWidth: 44,
      maxHeight: 44,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    dayText: { fontSize: 15 * fontScale, fontWeight: "600" as const },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: 2,
    },
  }));

  const monthLabel = formatMonthYear(year, month, locale);
  const weekdays = cal.weekdays;

  const goMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => goMonth(-1)} accessibilityLabel={cal.prevMonth}>
          <ChevronLeft color={colors.brand} size={22} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable style={styles.navBtn} onPress={() => goMonth(1)} accessibilityLabel={cal.nextMonth}>
          <ChevronRight color={colors.brand} size={22} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {weekdays.map((wd, i) => (
          <Text key={wd} style={[styles.weekday, i === 6 && styles.weekdaySun]}>
            {wd}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const key = cell.date.toDateString();
          const count = eventCountByDay.get(key) ?? 0;
          const selected = isSameCalendarDay(cell.date, selectedDate);
          const isToday = isSameCalendarDay(cell.date, today);
          const inMonth = cell.inMonth;

          let bg = "transparent";
          let textColor = inMonth ? colors.foreground : colors.muted;
          let borderColor = "transparent";
          let borderWidth = 0;

          if (selected) {
            bg = colors.brand;
            textColor = colors.white;
          } else if (isToday) {
            borderColor = colors.brand;
            borderWidth = 2;
          }

          const hasEvents = count > 0;

          return (
            <Pressable
              key={key + (inMonth ? "in" : "out")}
              style={styles.cell}
              onPress={() => onSelectDate(cell.date)}
            >
              <View
                style={[
                  styles.dayInner,
                  {
                    backgroundColor: bg,
                    borderColor,
                    borderWidth,
                  },
                ]}
              >
                <Text style={[styles.dayText, { color: textColor }]}>{cell.date.getDate()}</Text>
                {hasEvents ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: selected ? colors.white : colors.success },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
