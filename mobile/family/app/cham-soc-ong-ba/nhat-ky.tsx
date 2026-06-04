import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Pill, NotebookPen, Activity } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listCareTimeline,
  listElderlyProfiles,
  type ActivityRow,
} from "@mobile/api/elderly-care";
import { colors, radius } from "@mobile/theme/colors";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const kindStyle: Record<
  ActivityRow["kind"],
  { bg: string; Icon: typeof Pill; label: string }
> = {
  check: { bg: colors.tintGreen, Icon: ShieldCheck, label: "Safe Check" },
  med: { bg: colors.tintBlue, Icon: Pill, label: "Thuốc" },
  note: { bg: colors.tintOrange, Icon: NotebookPen, label: "Ghi chú" },
  vital: { bg: colors.tintPurple, Icon: Activity, label: "Sinh hiệu" },
};

export default function NhatKyChamSocScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const [days, setDays] = useState<7 | 30>(7);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const profilesQ = useQuery({
    queryKey: ["elderly-profiles", familyId],
    queryFn: () => listElderlyProfiles({ familyId: familyId! }),
    enabled: !!familyId,
  });

  const profiles = profilesQ.data ?? [];
  const profile = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? profiles[0] ?? null,
    [profiles, selectedId],
  );

  const timelineQ = useQuery({
    queryKey: ["care-timeline", profile?.id, days],
    queryFn: () =>
      listCareTimeline({
        elderlyId: profile!.id,
        familyId: familyId!,
        memberName: profile!.name,
        days,
      }),
    enabled: !!profile && !!familyId,
  });

  const rows = timelineQ.data ?? [];
  const groups = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const r of rows) {
      const key = new Date(r.at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const counts = useMemo(() => {
    const c = { check: 0, med: 0, note: 0, vital: 0 };
    for (const r of rows) c[r.kind]++;
    return c;
  }, [rows]);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Chăm sóc ông bà" title="Nhật ký chăm sóc" back="/cham-soc-ong-ba" />

      {profiles.length > 1 && (
        <View style={styles.chipRow}>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.chip, profile?.id === p.id && styles.chipActive]}
              onPress={() => setSelectedId(p.id)}
            >
              <Text style={profile?.id === p.id ? styles.chipTextActive : styles.chipText}>
                {p.avatar ?? "👵"} {p.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.rangeRow}>
        {([7, 30] as const).map((d) => (
          <Pressable
            key={d}
            style={[styles.rangeBtn, days === d && styles.rangeBtnActive]}
            onPress={() => setDays(d)}
          >
            <Text style={[styles.rangeText, days === d && styles.rangeTextActive]}>{d} ngày</Text>
          </Pressable>
        ))}
      </View>

      {!profile ? (
        <EmptyState
          title="Chưa có hồ sơ"
          description="Thêm hồ sơ ở màn Chăm sóc ông bà."
          actionLabel="Quay lại"
          onAction={() => router.back()}
        />
      ) : timelineQ.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <Card style={styles.summary}>
            <SectionHeader title="Tổng quan" subtitle={`${rows.length} hoạt động`} />
            <View style={styles.stats}>
              <Stat label="Safe Check" value={counts.check} tone={colors.tintGreen} />
              <Stat label="Thuốc" value={counts.med} tone={colors.tintBlue} />
              <Stat label="Ghi chú" value={counts.note} tone={colors.tintOrange} />
            </View>
          </Card>

          {groups.length === 0 ? (
            <EmptyState title={`Chưa có hoạt động trong ${days} ngày`} />
          ) : (
            groups.map(([day, items]) => (
              <View key={day} style={{ marginBottom: 16 }}>
                <Text style={styles.dayLabel}>
                  {fmtDate(day + "T00:00:00")} · {items.length} hoạt động
                </Text>
                {items.map((r) => {
                  const s = kindStyle[r.kind];
                  const Icon = s.Icon;
                  return (
                    <Card key={r.id} style={styles.item}>
                      <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
                        <Icon color={colors.foreground} size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.itemHead}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {r.title}
                          </Text>
                          <Text style={styles.itemTime}>{fmtTime(r.at)}</Text>
                        </View>
                        {r.detail ? <Text style={styles.itemDetail}>{r.detail}</Text> : null}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ))
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: tone }]}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  chipText: { fontWeight: "600", color: colors.foreground },
  chipTextActive: { fontWeight: "600", color: colors.white },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  rangeBtnActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  rangeText: { fontWeight: "600", color: colors.muted },
  rangeTextActive: { color: colors.white },
  summary: { marginBottom: 16 },
  stats: { flexDirection: "row", gap: 8, marginTop: 8 },
  stat: { flex: 1, padding: 10, borderRadius: radius.md, alignItems: "center" },
  statVal: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  statLabel: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: "center" },
  dayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  item: { flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  itemHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { fontWeight: "700", color: colors.foreground, flex: 1 },
  itemTime: { fontSize: 11, color: colors.muted },
  itemDetail: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
