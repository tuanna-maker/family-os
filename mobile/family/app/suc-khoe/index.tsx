import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Pill, Stethoscope } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listHealth } from "@mobile/api/health";

export default function SucKhoeScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const [member, setMember] = useState("all");

  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const tabs = useMemo(() => {
    const base = [{ id: "all", name: "Cả nhà" }];
    for (const p of q.data?.profiles ?? []) base.push({ id: p.name, name: p.name });
    return base;
  }, [q.data?.profiles]);

  const meds = (q.data?.meds ?? []).filter((m) => member === "all" || m.member_name === member);
  const appts = (q.data?.appts ?? [])
    .filter((a) => a.status !== "cancelled")
    .filter((a) => member === "all" || a.member_name === member)
    .slice(0, 5);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Gia đình" title="Sức khỏe gia đình" back="/(tabs)/gia-dinh" />

      <Pressable style={styles.manageBtn} onPress={() => router.push("/suc-khoe/quan-ly")}>
        <Text style={styles.manageText}>Quản lý hồ sơ & nhắc thuốc</Text>
        <ChevronRight color={colors.brand} size={18} />
      </Pressable>

      {q.isLoading && <LoadingState />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.tabs}>
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setMember(t.id)}
              style={[styles.tab, member === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, member === t.id && styles.tabTextActive]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <SectionHeader title="Nhắc uống thuốc" />
      {meds.length === 0 ? (
        <EmptyState title="Chưa có lịch thuốc" description="Thêm trong Quản lý sức khỏe" />
      ) : (
        meds.slice(0, 6).map((m) => (
          <Card key={m.id} style={styles.row}>
            <Pill color={colors.emergency} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{m.member_name} · {m.medicine}</Text>
              <Text style={styles.muted}>{m.time_of_day?.slice(0, 5) ?? "Hàng ngày"}</Text>
            </View>
          </Card>
        ))
      )}

      <SectionHeader title="Lịch khám sắp tới" />
      {appts.length === 0 ? (
        <Text style={styles.muted}>Không có lịch khám.</Text>
      ) : (
        appts.map((a) => (
          <Card key={a.id} style={styles.row}>
            <Stethoscope color={colors.brand} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{a.member_name}</Text>
              <Text style={styles.muted}>
                {new Date(a.scheduled_at).toLocaleString("vi-VN")}
                {a.doctor ? ` · ${a.doctor}` : ""}
              </Text>
            </View>
          </Card>
        ))
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.tintBlue,
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  manageText: { fontWeight: "700", color: colors.brand },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  tabText: { fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.white },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  rowTitle: { fontWeight: "700", color: colors.foreground },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
