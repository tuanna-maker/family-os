import { Image, Pressable, Text, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Phone,
  MessageSquare,
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Wallet,
  HeartHandshake,
  Calendar,
  QrCode,
  LayoutDashboard,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { unreadCount } from "@mobile/api/notifications";
import { Screen } from "@mobile/components/Screen";
import { Card, SectionTitle } from "@mobile/components/ui";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listNotifications } from "@mobile/api/notifications";
import { getFamilyToday } from "@mobile/api/family-today";

const HERO_URI =
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=70&auto=format";

const APP_ICON = require("../../assets/icon.webp");

const QUICK = [
  { icon: Wallet, label: "Chi tiêu", href: "/chi-tieu" as const, tint: "tintBlue" as const },
  { icon: Calendar, label: "Lịch", href: "/lich-gia-dinh" as const, tint: "tintPurple" as const },
  { icon: HeartHandshake, label: "Ông bà", href: "/cham-soc-ong-ba" as const, tint: "tintPink" as const },
  { icon: QrCode, label: "QR khách", href: "/qr-vao-ra" as const, tint: "tintGreen" as const },
  { icon: LayoutDashboard, label: "Cổng", href: "/portal" as const, tint: "tintOrange" as const },
];

function useHomeStyles() {
  return useThemedStyles((colors, fontScale) => ({
    header: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 16 },
    logoRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, maxWidth: "48%" as const },
    logoImg: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    headerActions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, flexShrink: 0 },
    iconBtn: {
      position: "relative" as const,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      ...cardShadow(colors),
    },
    bellBadge: {
      position: "absolute" as const,
      top: 6,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.emergency,
      paddingHorizontal: 4,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: colors.card,
    },
    bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: "800" as const },
    logoText: { fontSize: 17 * fontScale, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.3 },
    logoSub: { fontSize: 9 * fontScale, color: colors.muted, marginTop: 2 },
    hello: { fontSize: 12 * fontScale, color: colors.muted },
    name: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: colors.foreground, maxWidth: 130 },
    heroWrap: { borderRadius: radius.xl, overflow: "hidden" as const, minHeight: 300, ...cardShadow(colors) },
    heroContent: { padding: 20 },
    heroBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    heroBadgeText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 11 * fontScale,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    heroTitle: { color: colors.white, fontSize: 24 * fontScale, fontWeight: "800" as const, marginTop: 8, lineHeight: 30 },
    quickRow: { flexDirection: "row" as const, gap: 8, marginTop: 16 },
    quickItem: {
      flex: 1,
      alignItems: "center" as const,
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...cardShadow(colors),
    },
    quickIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    quickLabel: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" as const },
    sosBtn: {
      marginTop: 20,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.emergency,
      borderRadius: radius.lg,
      padding: 14,
    },
    sosTitle: { color: colors.white, fontSize: 17 * fontScale, fontWeight: "800" as const },
    sosSub: { color: "rgba(255,255,255,0.8)", fontSize: 12 * fontScale },
    chatBtn: {
      marginTop: 10,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
    },
    chatTitle: { color: colors.white, fontSize: 17 * fontScale, fontWeight: "800" as const },
    chatSub: { color: "rgba(255,255,255,0.65)", fontSize: 12 * fontScale },
    memberRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    memberName: { fontWeight: "700" as const, color: colors.foreground, fontSize: 15 * fontScale },
    memberStatus: { color: colors.muted, fontSize: 13 * fontScale },
    linkRow: { flexDirection: "row" as const, alignItems: "center" as const, marginTop: 8 },
    link: { color: colors.brand, fontWeight: "700" as const, fontSize: 14 * fontScale },
    muted: { color: colors.muted, fontSize: 14 * fontScale },
    activityRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      gap: 8,
    },
    activityTitle: { flex: 1, fontWeight: "600" as const, color: colors.foreground, fontSize: 15 * fontScale },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  }));
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { theme: prefTheme, setTheme } = useAppPrefs();
  const styles = useHomeStyles();
  const { familyId, family } = useFamilyContext();
  const displayName = family?.name ?? "Gia đình";

  const unreadQ = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: unreadCount,
    refetchInterval: 60_000,
  });
  const unread = unreadQ.data?.count ?? 0;

  const activitiesQ = useQuery({
    queryKey: ["home-activities", 5],
    queryFn: () => listNotifications({ limit: 5, offset: 0 }),
  });

  const todayQ = useQuery({
    queryKey: ["family-today", familyId],
    queryFn: () => getFamilyToday({ family_id: familyId! }),
    enabled: !!familyId,
  });

  return (
    <Screen contentStyle={{ paddingTop: 12 }}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={APP_ICON} style={styles.logoImg} resizeMode="cover" accessibilityLabel="STOS Family" />
          <View>
            <Text style={styles.logoText}>
              STOS <Text style={{ color: colors.brand }}>Life</Text>
            </Text>
            <Text style={styles.logoSub}>Operating System for Residential Life</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: "flex-end", flex: 1, minWidth: 0, marginHorizontal: 4 }}>
          <Text style={styles.hello}>Xin chào,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {displayName} 👋
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setTheme(prefTheme === "dark" ? "light" : "dark")}
            accessibilityLabel={prefTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            accessibilityRole="button"
          >
            {theme === "dark" ? <Sun color={colors.foreground} size={18} /> : <Moon color={colors.foreground} size={18} />}
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push("/thong-bao")}
            accessibilityLabel="Thông báo"
            accessibilityRole="button"
          >
            <Bell color={colors.foreground} size={20} />
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.heroWrap}>
        <Image source={{ uri: HERO_URI }} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <LinearGradient colors={["#071A3DE6", "#071A3D88", "#071A3D44"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <ShieldCheck color="rgba(255,255,255,0.8)" size={14} />
            <Text style={styles.heroBadgeText}>Dịch vụ bảo an gia đình</Text>
          </View>
          <Text style={styles.heroTitle}>An toàn gia đình{"\n"}là ưu tiên hàng đầu</Text>
          <Pressable style={styles.sosBtn} onPress={() => router.push("/(tabs)/bao-an")}>
            <Phone color={colors.white} size={22} fill={colors.white} />
            <View>
              <Text style={styles.sosTitle}>Gọi hỗ trợ ngay</Text>
              <Text style={styles.sosSub}>Nhấn để gọi đội ngũ bảo an</Text>
            </View>
          </Pressable>
          <Pressable style={styles.chatBtn} onPress={() => router.push("/bao-an/chat")}>
            <MessageSquare color={colors.white} size={22} />
            <View>
              <Text style={styles.chatTitle}>Nhắn tin cho bảo an</Text>
              <Text style={styles.chatSub}>Trao đổi – Yêu cầu</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.quickRow}>
        {QUICK.map((item) => (
          <Pressable key={item.href} style={styles.quickItem} onPress={() => router.push(item.href)}>
            <View style={[styles.quickIcon, { backgroundColor: colors[item.tint] }]}>
              <item.icon color={colors.brand} size={22} />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Gia đình hôm nay</SectionTitle>
        {todayQ.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (todayQ.data?.members ?? []).length === 0 ? (
          <Text style={styles.muted}>Chưa có dữ liệu hôm nay.</Text>
        ) : (
          (todayQ.data?.members ?? []).slice(0, 4).map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberStatus}>{m.status}</Text>
            </View>
          ))
        )}
        <Pressable onPress={() => router.push("/(tabs)/gia-dinh")} style={styles.linkRow}>
          <Text style={styles.link}>Xem tất cả</Text>
          <ChevronRight color={colors.brand} size={16} />
        </Pressable>
      </Card>

      <Card style={{ marginTop: 16, marginBottom: 24 }}>
        <SectionTitle>Hoạt động gần đây</SectionTitle>
        {activitiesQ.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (activitiesQ.data?.rows ?? []).length === 0 ? (
          <Text style={styles.muted}>Chưa có hoạt động.</Text>
        ) : (
          (activitiesQ.data?.rows ?? []).map((a) => (
            <View key={a.id} style={styles.activityRow}>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {a.title}
              </Text>
              {!a.read_at && <View style={styles.unreadDot} />}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
