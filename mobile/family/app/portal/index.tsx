import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Baby,
  Calendar,
  HeartPulse,
  LayoutDashboard,
  Refrigerator,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, SectionTitle } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getDashboard } from "@mobile/api/dashboard";
import { suggestMeals } from "@mobile/api/food";
import { listFamilyEvents } from "@mobile/api/family-events";
import { listNotifications } from "@mobile/api/notifications";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

const LINKS = [
  { label: "Gia đình", icon: Users, href: "/(tabs)/gia-dinh" },
  { label: "Lịch", icon: Calendar, href: "/lich-gia-dinh" },
  { label: "Chi tiêu", icon: Wallet, href: "/chi-tieu" },
  { label: "Con cái", icon: Baby, href: "/con-cai" },
  { label: "Sức khỏe", icon: HeartPulse, href: "/suc-khoe" },
  { label: "Tủ lạnh", icon: Refrigerator, href: "/thuc-pham" },
  { label: "Du lịch", icon: Sparkles, href: "/du-lich" },
] as const;

export default function PortalScreen() {
  const router = useRouter();
  const { familyId, family } = useFamilyContext();
  const { colors } = useTheme();
  const styles = usePortalStyles();

  const dashQ = useQuery({
    queryKey: ["portal-dashboard", familyId],
    queryFn: () => getDashboard({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const mealsQ = useQuery({
    queryKey: ["meal-suggest", familyId],
    queryFn: () => suggestMeals({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const eventsQ = useQuery({
    queryKey: ["portal-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const notifQ = useQuery({
    queryKey: ["portal-notif", familyId],
    queryFn: () => listNotifications({ limit: 5, offset: 0 }),
  });

  const dash = dashQ.data;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="STOS Life"
        title="Cổng gia đình"
        back="/(tabs)/home"
        right={<LayoutDashboard color={colors.brand} size={22} />}
      />

      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>{family?.name ?? "Gia đình"}</Text>
        <Text style={styles.heroSub}>
          {dash?.member_count ?? 0} thành viên · Chi tiêu tháng{" "}
          {(dash?.expenses_month.total ?? 0).toLocaleString("vi-VN")}đ
        </Text>
      </Card>

      <SectionTitle>Đi nhanh</SectionTitle>
      <View style={styles.linkGrid}>
        {LINKS.map((l) => (
          <Pressable key={l.href} style={styles.linkTile} onPress={() => router.push(l.href)}>
            <l.icon color={colors.brand} size={20} />
            <Text style={styles.linkLabel}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Gợi ý bữa ăn</SectionTitle>
      {mealsQ.isLoading && <LoadingState />}
      {(mealsQ.data?.suggestions ?? []).map((s, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.mealTitle}>{s.title}</Text>
          <Text style={styles.mealSub}>{s.reason} · {s.time}</Text>
        </Card>
      ))}

      <SectionTitle>Lịch sắp tới</SectionTitle>
      {(eventsQ.data ?? []).slice(0, 4).map((e) => (
        <Pressable key={e.id} onPress={() => router.push("/lich-gia-dinh")}>
          <Card style={{ marginBottom: 8 }}>
            <Text style={styles.mealTitle}>{e.title}</Text>
            <Text style={styles.mealSub}>
              {new Date(e.starts_at).toLocaleString("vi-VN")}
              {e.location ? ` · ${e.location}` : ""}
            </Text>
          </Card>
        </Pressable>
      ))}

      <SectionTitle>Thông báo mới</SectionTitle>
      {(notifQ.data?.rows ?? []).map((n) => (
        <Pressable key={n.id} onPress={() => router.push("/thong-bao")}>
          <Card style={{ marginBottom: 8 }}>
            <Text style={styles.mealTitle}>{n.title}</Text>
            {!n.read_at && <View style={styles.dot} />}
          </Card>
        </Pressable>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function usePortalStyles() {
  return useThemedStyles((colors, fontScale) => ({
    hero: { marginBottom: 16 },
    heroTitle: { fontSize: 20 * fontScale, fontWeight: "800" as const, color: colors.foreground },
    heroSub: { fontSize: 13 * fontScale, color: colors.muted, marginTop: 4 },
    linkGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 20 },
    linkTile: {
      width: "31%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radius.lg,
      padding: 12,
      alignItems: "center" as const,
      gap: 6,
    },
    linkLabel: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" as const },
    mealTitle: { fontWeight: "700" as const, color: colors.foreground },
    mealSub: { fontSize: 12 * fontScale, color: colors.muted, marginTop: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
  }));
}
