import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listMyShifts, type GuardShift } from "@guard/api/guard-shifts";
import { dayChip, shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";
import { useTheme } from "@mobile/theme/themeStore";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const { colors } = useTheme();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["guard-my-shifts"],
    queryFn: () => listMyShifts(),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, GuardShift>();
    for (const s of shifts) {
      const key = String(s.shift_date).slice(0, 10);
      map.set(key, s);
    }
    return map;
  }, [shifts]);

  const today = isoDate(new Date());
  const weekLabel = `${weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${weekEnd.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = isoDate(date);
    const shift = byDate.get(key);
    const chip = dayChip(date.toISOString());
    return { key, chip, shift, isToday: key === today };
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={tabPad}>
      <View
        className="px-5 pb-4 bg-background border-b border-border"
        style={{ paddingTop: Math.max(insets.top + 12, 48) }}
      >
        <Text className="text-xl font-bold text-foreground">Lịch trực</Text>
      </View>

      <View className="px-5 mt-3">
        <View className="rounded-2xl bg-card border border-border p-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => setWeekStart((w) => addDays(w, -7))}
            className="h-8 w-8 rounded-full bg-muted items-center justify-center"
          >
            <ChevronLeft size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-sm font-semibold text-foreground">{weekLabel}</Text>
          <TouchableOpacity
            onPress={() => setWeekStart((w) => addDays(w, 7))}
            className="h-8 w-8 rounded-full bg-muted items-center justify-center"
          >
            <ChevronRight size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-5 mt-4 pb-8">
        {isLoading ? (
          <ActivityIndicator className="mt-8" />
        ) : isError ? (
          <Text className="text-sm text-destructive mt-4">
            Không tải được lịch trực: {error instanceof Error ? error.message : "Lỗi không xác định"}
          </Text>
        ) : (
          days.map(({ key, chip, shift, isToday }) => {
            if (!shift) {
              return (
                <View
                  key={key}
                  className="rounded-2xl bg-card border border-border p-3 flex-row items-center gap-4 mb-2.5"
                >
                  <DayChip day={chip.day} date={chip.date} dim />
                  <Text className="text-sm font-semibold text-muted-foreground">NGHỈ</Text>
                </View>
              );
            }
            const upcoming = key > today;
            return (
              <View
                key={key}
                className={`rounded-2xl border p-3 flex-row items-start gap-4 mb-2.5 ${
                  isToday ? "bg-brand/10 border-brand/30" : "bg-card border-border"
                }`}
              >
                <DayChip day={chip.day} date={chip.date} />
                <View className="flex-1 min-w-0">
                  <Text className="text-[13px] font-semibold text-foreground">
                    <Text className="text-success">{shiftLabel(shift.shift_type)}:</Text>{" "}
                    {shiftTimeRange(shift.shift_type)}
                  </Text>
                  <Text className="text-[12px] mt-0.5 text-muted-foreground">
                    {shift.status === "checked_in"
                      ? "Đang trực"
                      : shift.status === "checked_out"
                        ? "Đã kết thúc"
                        : "Đã phân ca"}
                  </Text>
                  {shift.notes ? (
                    <Text className="text-[11px] text-muted-foreground mt-0.5">{shift.notes}</Text>
                  ) : null}
                </View>
                {isToday ? (
                  <View className="bg-brand px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-semibold text-white">Hôm nay</Text>
                  </View>
                ) : upcoming ? (
                  <View className="bg-accent px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-semibold text-brand">Sắp tới</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function DayChip({
  day,
  date,
  dim,
}: {
  day: string;
  date: string;
  dim?: boolean;
}) {
  return (
    <View className={`shrink-0 w-12 items-center ${dim ? "opacity-50" : ""}`}>
      <Text className="text-[10px] uppercase text-muted-foreground">{day}</Text>
      <Text className="text-sm font-bold text-foreground">{date}</Text>
    </View>
  );
}
