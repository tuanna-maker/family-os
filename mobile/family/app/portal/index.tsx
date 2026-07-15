import { Pressable, Text, View } from "react-native";
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
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency, formatDateTime } from "@mobile/i18n/format";

export default function PortalScreen() {
  const router = useRouter();
  const { familyId, family } = useFamilyContext();
  const { colors } = useTheme();
  const styles = usePortalStyles();
  const { locale, s } = useI18n();
  const pt = s.screens.portal;
  const c = s.common;

  const links = [
    { label: pt.links.family, icon: Users, href: "/(tabs)/gia-dinh" },
    { label: pt.links.calendar, icon: Calendar, href: "/lich-gia-dinh" },
    { label: pt.links.expense, icon: Wallet, href: "/chi-tieu" },
    { label: pt.links.children, icon: Baby, href: "/con-cai" },
    { label: pt.links.health, icon: HeartPulse, href: "/suc-khoe" },
    { label: pt.links.fridge, icon: Refrigerator, href: "/thuc-pham" },
    { label: pt.links.travel, icon: Sparkles, href: "/du-lich" },
  ] as const;

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
        eyebrow={pt.eyebrow}
        title={pt.title}
        back="/(tabs)/home"
        right={<LayoutDashboard color={colors.brand} size={22} />}
      />

      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>{family?.name ?? c.defaultFamilyName}</Text>
        <Text style={styles.heroSub}>
          {pt.heroSub(dash?.member_count ?? 0, formatCurrency(dash?.expenses_month.total ?? 0, locale))}
        </Text>
      </Card>

      <SectionTitle>{pt.quickLinks}</SectionTitle>
      <View style={styles.linkGrid}>
        {links.map((l) => (
          <Pressable key={l.href} style={styles.linkTile} onPress={() => router.push(l.href)}>
            <l.icon color={colors.brand} size={20} />
            <Text style={styles.linkLabel}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>{pt.mealSuggestions}</SectionTitle>
      {mealsQ.isLoading && <LoadingState />}
      {(mealsQ.data?.suggestions ?? []).map((item, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.mealTitle}>{item.title}</Text>
          <Text style={styles.mealSub}>{item.reason} · {item.time}</Text>
        </Card>
      ))}

      <SectionTitle>{pt.upcomingEvents}</SectionTitle>
      {(eventsQ.data ?? []).slice(0, 4).map((e) => (
        <Pressable key={e.id} onPress={() => router.push("/lich-gia-dinh")}>
          <Card style={{ marginBottom: 8 }}>
            <Text style={styles.mealTitle}>{e.title}</Text>
            <Text style={styles.mealSub}>
              {formatDateTime(e.starts_at, locale)}
              {e.location ? ` · ${e.location}` : ""}
            </Text>
          </Card>
        </Pressable>
      ))}

      <SectionTitle>{pt.newNotifications}</SectionTitle>
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
