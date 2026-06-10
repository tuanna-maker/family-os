import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock, Phone, Shield } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import {
  buildWeekDays,
  getCurrentWeekRange,
  GuardWeekCalendar,
  isoDate,
} from "@mobile/components/security/GuardWeekCalendar";
import { isSameCalendarDay } from "@mobile/components/calendar/MonthCalendar";
import {
  listProjectGuardSchedule,
  listProjectGuards,
  type ProjectGuard,
  type ProjectGuardShift,
} from "@mobile/api/security-services";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { getTabBarBottomInset } from "@mobile/theme/tabBar";

const SHIFT_LABEL: Record<string, string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  night: "Ca đêm",
};

function isUnscopedError(err: unknown) {
  return ((err as Error)?.message ?? "").includes("chưa được liên kết với căn hộ");
}

function GuardCard({
  g,
  styles,
  colors,
}: {
  g: ProjectGuard;
  styles: ReturnType<typeof useStyles>;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const initials = (g.full_name ?? "BV")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  const roleLabel = g.role === "security_admin" ? "Trưởng ca / Quản lý" : "Bảo vệ";

  return (
    <Card style={{ marginBottom: 10, padding: 14 }}>
      <View style={styles.guardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={styles.name}>{g.full_name ?? "Bảo vệ"}</Text>
            {g.on_shift_today ? (
              <View style={styles.badge}>
                <CheckCircle2 color={colors.success} size={11} />
                <Text style={styles.badgeText}>Đang trực</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Shield color={colors.muted} size={12} />
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
          {g.next_shift_at && !g.on_shift_today ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Clock color={colors.muted} size={12} />
              <Text style={styles.role}>
                Ca tới:{" "}
                {new Date(g.next_shift_at).toLocaleString("vi-VN", {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ) : null}
        </View>
        {g.phone ? (
          <Pressable
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${g.phone!.replace(/\s/g, "")}`)}
            accessibilityLabel="Gọi bảo vệ"
          >
            <Phone color={colors.white} size={16} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function ShiftDetailPanel({
  selectedDate,
  shifts,
  styles,
  colors,
}: {
  selectedDate: Date;
  shifts: ProjectGuardShift[];
  styles: ReturnType<typeof useStyles>;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const dayShifts = shifts.filter((s) => s.shift_date.slice(0, 10) === isoDate(selectedDate));
  const isToday = isSameCalendarDay(selectedDate, new Date());
  const dayLabel = selectedDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <>
      <View style={styles.dayHeader}>
        <Calendar color={colors.brand} size={18} />
        <Text style={styles.dayTitle}>{dayLabel}</Text>
        {isToday ? (
          <View style={styles.todayPill}>
            <Text style={styles.todayPillText}>Hôm nay</Text>
          </View>
        ) : null}
        <Text style={styles.shiftCount}>{dayShifts.length} ca</Text>
      </View>

      {dayShifts.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.empty}>Không có ca trực trong ngày này.</Text>
        </View>
      ) : (
        dayShifts.map((s) => (
          <Card key={s.shift_id} style={{ marginBottom: 8, padding: 14 }}>
            <View style={styles.shiftRow}>
              <View style={styles.shiftAvatar}>
                <Text style={styles.shiftAvatarText}>
                  {(s.guard_name ?? "BV").split(/\s+/).slice(-1)[0]?.slice(0, 2).toUpperCase() ?? "BV"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.guard_name ?? "Bảo vệ"}</Text>
                <Text style={styles.role}>{SHIFT_LABEL[s.shift_type] ?? s.shift_type}</Text>
                <Text style={styles.role}>
                  {new Date(s.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(s.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    tabs: { flexDirection: "row" as const, gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.lg,
      alignItems: "center" as const,
      backgroundColor: c.mutedBg,
    },
    tabActive: { backgroundColor: c.brand },
    tabText: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.muted },
    tabTextActive: { color: c.white },
    warn: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.warning,
      backgroundColor: c.tintOrange,
    },
    warnTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    warnBody: { fontSize: 13 * fontScale, color: c.muted, marginTop: 4 },
    guardRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.brand },
    name: { fontSize: 15 * fontScale, fontWeight: "600" as const, color: c.foreground },
    role: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: c.tintGreen,
    },
    badgeText: { fontSize: 11 * fontScale, fontWeight: "600" as const, color: c.success },
    callBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.success,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    empty: { color: c.muted, textAlign: "center" as const, fontSize: 14 * fontScale },
    emptyDay: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 24,
      alignItems: "center" as const,
    },
    dayHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    dayTitle: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground, flex: 1 },
    shiftCount: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.brand },
    todayPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: c.tintBlue,
    },
    todayPillText: { fontSize: 10 * fontScale, fontWeight: "700" as const, color: c.brand },
    shiftRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    shiftAvatar: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    shiftAvatarText: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.brand },
  }));
}

export default function BaoVeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [tab, setTab] = useState<"team" | "schedule">("team");

  const range = useMemo(() => getCurrentWeekRange(), []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });

  const guardsQ = useQuery({ queryKey: ["project-guards"], queryFn: () => listProjectGuards() });
  const scheduleQ = useQuery({
    queryKey: ["project-guard-schedule", range.from, range.to],
    queryFn: () => listProjectGuardSchedule(range),
  });

  const shifts = scheduleQ.data?.shifts ?? [];

  const weekDays = useMemo(() => {
    const days = buildWeekDays(range.from, range.to);
    const countByIso = new Map<string, number>();
    for (const s of shifts) {
      const key = s.shift_date.slice(0, 10);
      countByIso.set(key, (countByIso.get(key) ?? 0) + 1);
    }
    return days.map((d) => ({ ...d, shiftCount: countByIso.get(d.iso) ?? 0 }));
  }, [range.from, range.to, shifts]);

  useEffect(() => {
    if (tab !== "schedule" || shifts.length === 0) return;
    const selectedIso = isoDate(selectedDate);
    if (shifts.some((s) => s.shift_date.slice(0, 10) === selectedIso)) return;
    const first = shifts[0]?.shift_date.slice(0, 10);
    if (first) {
      const [y, m, d] = first.split("-").map(Number);
      setSelectedDate(new Date(y, m - 1, d, 0, 0, 0, 0));
    }
  }, [tab, shifts, selectedDate]);

  const unscoped =
    (guardsQ.isError && isUnscopedError(guardsQ.error)) ||
    (scheduleQ.isError && isUnscopedError(scheduleQ.error));

  const onSelectDate = (d: Date) => {
    const next = new Date(d);
    next.setHours(0, 0, 0, 0);
    setSelectedDate(next);
  };

  return (
    <Screen scroll={false} contentStyle={{ paddingTop: 0 }} insetTabBar={false}>
      <PageHeader
        title="Đội bảo vệ chung cư"
        subtitle="Lịch trực đội bảo vệ & danh sách nhân sự phụ trách dự án"
        back="/(tabs)/bao-an"
      />

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === "team" && styles.tabActive]} onPress={() => setTab("team")}>
          <Text style={[styles.tabText, tab === "team" && styles.tabTextActive]}>Đội bảo vệ</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "schedule" && styles.tabActive]} onPress={() => setTab("schedule")}>
          <Text style={[styles.tabText, tab === "schedule" && styles.tabTextActive]}>Lịch trực tuần</Text>
        </Pressable>
      </View>

      {unscoped ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>Tài khoản chưa liên kết căn hộ</Text>
          <Text style={styles.warnBody}>
            Vui lòng liên hệ Ban Quản Lý chung cư để được cập nhật căn hộ. Sau đó bạn sẽ xem được đội bảo vệ và lịch
            trực của chung cư mình.
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: getTabBarBottomInset(insets) }}
        showsVerticalScrollIndicator={false}
      >
        {tab === "team" && !unscoped ? (
          guardsQ.isLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
          ) : guardsQ.isError ? (
            <Card>
              <Text style={styles.empty}>{(guardsQ.error as Error).message}</Text>
            </Card>
          ) : (guardsQ.data?.guards ?? []).length === 0 ? (
            <Text style={styles.empty}>Chưa có bảo vệ nào được phân công cho chung cư.</Text>
          ) : (
            guardsQ.data!.guards.map((g) => <GuardCard key={g.guard_id} g={g} styles={styles} colors={colors} />)
          )
        ) : null}

        {tab === "schedule" && !unscoped ? (
          scheduleQ.isLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
          ) : scheduleQ.isError ? (
            <Card>
              <Text style={styles.empty}>{(scheduleQ.error as Error).message}</Text>
            </Card>
          ) : (
            <>
              <GuardWeekCalendar
                days={weekDays}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                rangeFrom={range.from}
                rangeTo={range.to}
              />
              <ShiftDetailPanel
                selectedDate={selectedDate}
                shifts={shifts}
                styles={styles}
                colors={colors}
              />
            </>
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}
