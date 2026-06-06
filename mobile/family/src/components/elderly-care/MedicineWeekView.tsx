import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { CheckCircle2, Pill } from "lucide-react-native";
import { Card } from "@mobile/components/ui";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export type MedicineWeekDay = {
  date: string;
  entries: Array<{
    reminder_id: string;
    medicine: string;
    time_of_day: string | null;
    taken: boolean;
  }>;
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MedicineWeekView({
  days,
  isLoading,
  onMark,
  pending,
}: {
  days: MedicineWeekDay[];
  isLoading: boolean;
  onMark: (reminderId: string) => void;
  pending: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    empty: { color: c.muted, textAlign: "center" as const, padding: 16, fontSize: 14 * fontScale },
    dayCard: { marginBottom: 10, padding: 0, overflow: "hidden" as const },
    dayHead: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    dayHeadToday: { backgroundColor: c.tintBlue },
    dayTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    todayBadge: { fontSize: 10 * fontScale, color: c.brand, fontWeight: "700" as const },
    daySub: { fontSize: 11 * fontScale, color: c.muted },
    entry: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    medName: { fontSize: 13 * fontScale, fontWeight: "700" as const, color: c.foreground },
    medTime: { fontSize: 11 * fontScale, color: c.muted },
    markBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm,
      backgroundColor: c.brand,
      minWidth: 72,
      alignItems: "center" as const,
    },
    markBtnDone: { backgroundColor: c.mutedBg },
    markBtnText: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.white },
    markBtnTextDone: { color: c.muted },
  }));

  if (isLoading) {
    return <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />;
  }
  if (days.length === 0 || days.every((d) => d.entries.length === 0)) {
    return <Text style={styles.empty}>Chưa có nhắc thuốc nào trong tuần.</Text>;
  }

  const today = todayKey();

  return (
    <View>
      {days.map((d) => {
        const isToday = d.date === today;
        const isPast = d.date < today;
        const taken = d.entries.filter((e) => e.taken).length;
        const dt = new Date(d.date + "T00:00:00");
        return (
          <Card key={d.date} style={styles.dayCard}>
            <View style={[styles.dayHead, isToday && styles.dayHeadToday]}>
              <View>
                <Text style={styles.dayTitle}>
                  {dt.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  {isToday ? <Text style={styles.todayBadge}> HÔM NAY</Text> : null}
                </Text>
                <Text style={styles.daySub}>
                  {taken}/{d.entries.length} đã uống
                </Text>
              </View>
            </View>
            {d.entries.length === 0 ? (
              <Text style={[styles.empty, { padding: 12 }]}>Không có thuốc.</Text>
            ) : (
              d.entries.map((e, idx) => (
                <View
                  key={`${d.date}-${e.reminder_id}`}
                  style={[styles.entry, idx === d.entries.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: e.taken ? colors.tintGreen : colors.tintOrange },
                    ]}
                  >
                    <Pill color={e.taken ? colors.success : colors.warning} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, e.taken && { textDecorationLine: "line-through", color: colors.muted }]}>
                      {e.medicine}
                    </Text>
                    {e.time_of_day ? <Text style={styles.medTime}>{e.time_of_day}</Text> : null}
                  </View>
                  {isToday && !e.taken ? (
                    <Pressable
                      style={styles.markBtn}
                      disabled={pending}
                      onPress={() => onMark(e.reminder_id)}
                    >
                      <Text style={styles.markBtnText}>Đã uống</Text>
                    </Pressable>
                  ) : e.taken ? (
                    <CheckCircle2 color={colors.success} size={18} />
                  ) : (
                    <Text
                      style={{
                        fontSize: 10,
                        color: isPast ? colors.emergency : colors.muted,
                        fontWeight: "600",
                      }}
                    >
                      {isPast ? "Bỏ lỡ" : "Chờ"}
                    </Text>
                  )}
                </View>
              ))
            )}
          </Card>
        );
      })}
    </View>
  );
}
