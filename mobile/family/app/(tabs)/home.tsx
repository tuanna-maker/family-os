import { useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  ShieldCheck,
  Phone,
  MessageSquare,
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Clock,
  UserCheck,
  Loader2,
} from "lucide-react-native";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { useI18n } from "@mobile/i18n/useI18n";
import { unreadCount } from "@mobile/api/notifications";
import { listNotifications } from "@mobile/api/notifications";
import { getFamilyToday } from "@mobile/api/family-today";
import { getSecurityStatus, type SecurityTone } from "@mobile/api/security";
import { Screen } from "@mobile/components/Screen";
import { Card, SectionTitle } from "@mobile/components/ui";
import { FamilyMemberRow } from "@mobile/components/home/FamilyMemberRow";
import {
  SECURITY_HERO,
  getHomeServices,
  SECURITY_CHIP_ICONS,
  securityToneStyle,
  formatActivityTime,
  getActivityVisual,
  colorFromKey,
  getDefaultSecurityChips,
} from "@mobile/components/home/homeVisuals";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useLayoutInfo } from "@mobile/hooks/useLayoutInfo";

const ACTIVITY_PAGE_SIZE = 5;

function FeatureBadge({
  Icon,
  title,
  sub,
}: {
  Icon: typeof ShieldCheck;
  title: string;
  sub: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.md,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 8,
        paddingVertical: 6,
        maxWidth: 160,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          backgroundColor: "rgba(37,99,235,0.4)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon color="#fff" size={12} />
      </View>
      <View>
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{sub}</Text>
      </View>
    </View>
  );
}

function useHomeStyles() {
  return useThemedStyles((colors, fontScale) => ({
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: 12,
    },
    logoGradient: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      ...cardShadow(colors),
    },
    logoTextBlock: { flexShrink: 1, minWidth: 0, maxWidth: 120 },
    logoText: { fontSize: 17 * fontScale, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.3 },
    logoSub: { fontSize: 10 * fontScale, color: colors.muted, marginTop: 2, lineHeight: 13 },
    greetBlock: { flex: 1, minWidth: 72, alignItems: "flex-end" as const },
    hello: { fontSize: 12 * fontScale, color: colors.muted },
    name: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: colors.foreground },
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
    heroWrap: { borderRadius: radius.xl, overflow: "hidden" as const, minHeight: 340, ...cardShadow(colors) },
    heroInner: { padding: 20 },
    heroBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    heroBadgeText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 11 * fontScale,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    heroTitle: { color: colors.white, fontSize: 24 * fontScale, fontWeight: "800" as const, marginTop: 8, lineHeight: 30, maxWidth: 280 },
    badgeRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginTop: 14, maxWidth: 300 },
    ctaIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sosBtn: {
      marginTop: 18,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.emergency,
      borderRadius: radius.lg,
      padding: 14,
      maxWidth: 320,
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
      maxWidth: 320,
    },
    chatTitle: { color: colors.white, fontSize: 17 * fontScale, fontWeight: "800" as const },
    chatSub: { color: "rgba(255,255,255,0.65)", fontSize: 12 * fontScale },
    pill247: {
      marginTop: 16,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      alignSelf: "flex-start" as const,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pill247Text: { color: colors.white, fontSize: 14 * fontScale, fontWeight: "600" as const },
    securityCard: {
      marginTop: 16,
      borderRadius: radius.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      padding: 14,
      gap: 12,
      ...cardShadow(colors),
    },
    securityTop: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    securityMain: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, flex: 1, minWidth: 0 },
    securityIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: "center" as const, justifyContent: "center" as const, flexShrink: 0 },
    securityTextBlock: { flex: 1, minWidth: 0 },
    securityLabel: { fontSize: 14 * fontScale, color: colors.muted },
    securityHeadline: { fontSize: 16 * fontScale, fontWeight: "700" as const },
    securitySub: { fontSize: 12 * fontScale, color: colors.muted, marginTop: 2 },
    securityDivider: { height: 1, backgroundColor: colors.cardBorder, marginBottom: 2 },
    chipScroll: { marginHorizontal: -2, flexGrow: 0 },
    chipScrollContent: { alignItems: "center" as const, paddingTop: 8, paddingBottom: 6, paddingRight: 4 },
    chipItem: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginRight: 16 },
    chipIconWrap: { paddingTop: 6, paddingRight: 6, position: "relative" as const },
    chipIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center" as const, justifyContent: "center" as const },
    chipTextBlock: { maxWidth: 140 },
    chipLabel: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: colors.foreground },
    chipValue: { fontSize: 12 * fontScale },
    chipCount: {
      position: "absolute" as const,
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 4,
    },
    chipCountText: { color: colors.white, fontSize: 10, fontWeight: "800" as const },
    servicesGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, marginHorizontal: -6 },
    serviceCell: { width: "33.33%" as const, paddingHorizontal: 6, marginBottom: 20, alignItems: "center" as const },
    serviceIconBox: {
      width: "100%" as const,
      height: 64,
      borderRadius: radius.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    serviceLabel: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: colors.foreground, textAlign: "center" as const, marginTop: 8 },
    serviceSub: { fontSize: 12 * fontScale, fontWeight: "500" as const, color: colors.muted },
    sosCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.emergency,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sosCircleText: { color: colors.white, fontSize: 13, fontWeight: "900" as const },
    cardHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 12 },
    link: { color: colors.brand, fontWeight: "700" as const, fontSize: 14 * fontScale },
    muted: { color: colors.muted, fontSize: 14 * fontScale, textAlign: "center" as const, paddingVertical: 16 },
    skeleton: { height: 64, borderRadius: radius.lg, backgroundColor: colors.mutedBg, marginBottom: 8 },
    activityRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center" as const, justifyContent: "center" as const },
    activityTitle: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: colors.foreground },
    activityBody: { fontSize: 14 * fontScale, color: colors.muted },
    activityTime: { fontSize: 14 * fontScale, color: colors.muted },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
    loadMore: {
      marginTop: 12,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.mutedBg,
      paddingVertical: 12,
    },
    loadMoreText: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: colors.foreground },
  }));
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { theme: prefTheme, setTheme } = useAppPrefs();
  const { locale, s } = useI18n();
  const h = s.home;
  const c = s.common;
  const styles = useHomeStyles();
  const { isLandscape } = useLayoutInfo();
  const { familyId, family } = useFamilyContext();
  const displayName = family?.name ?? c.defaultFamilyName;
  const services = getHomeServices(locale);
  const defaultChips = getDefaultSecurityChips(locale);
  const [pageCount, setPageCount] = useState(1);
  const limit = pageCount * ACTIVITY_PAGE_SIZE;

  const unreadQ = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: unreadCount,
    staleTime: 45_000,
  });
  const unread = unreadQ.data?.count ?? 0;

  const activitiesQ = useQuery({
    queryKey: ["home-activities", limit],
    queryFn: () => listNotifications({ limit, offset: 0 }),
  });

  const todayQ = useQuery({
    queryKey: ["family-today", familyId, locale],
    queryFn: () => getFamilyToday({ family_id: familyId!, locale }),
    enabled: !!familyId,
  });

  const securityQ = useQuery({
    queryKey: ["security-status", familyId, locale],
    queryFn: () => getSecurityStatus({ family_id: familyId!, locale }),
    enabled: !!familyId,
    staleTime: 45_000,
  });

  const activities = activitiesQ.data?.rows ?? [];
  const total = activitiesQ.data?.total ?? 0;
  const hasMore = activities.length < total;
      const showCollapse = pageCount > 1 && !hasMore;
  const todayMembers = todayQ.data?.members ?? [];
  const security = securityQ.data;
  const securityTone: SecurityTone = security?.overall ?? "success";
  const securityStyle = securityToneStyle(colors, securityTone);
  const securityHeadline =
    security?.headline ?? (securityQ.isLoading ? h.checking : h.allNormal);
  const securityChips = security?.chips ?? defaultChips;
  const securityUpdated = security?.updated_at
    ? c.updatedAt(formatActivityTime(security.updated_at, locale))
    : security?.subline ?? h.monitoring;

  const securityBorder =
    securityTone === "emergency"
      ? colors.emergency
      : securityTone === "warning"
        ? colors.warning
        : colors.cardBorder;

  const logoGrad: [string, string] =
    theme === "dark" ? [colors.brand, colors.brandDeep] : [colors.brand, "#071A3D"];

  return (
    <Screen contentStyle={{ paddingTop: Math.max(insets.top + 8, 16) }}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, minWidth: 0 }}>
          <LinearGradient colors={logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoGradient}>
            <ShieldCheck color={colors.white} size={20} fill={colors.white} />
          </LinearGradient>
          <View style={styles.logoTextBlock}>
            <Text style={styles.logoText} numberOfLines={1}>
              STOS <Text style={{ color: colors.brand }}>Life</Text>
            </Text>
            <Text style={styles.logoSub} numberOfLines={2}>
              Operating System for Residential Life
            </Text>
          </View>
        </View>
        <View style={styles.greetBlock}>
          <Text style={styles.hello}>{h.hello}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {displayName} 👋
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setTheme(prefTheme === "dark" ? "light" : "dark")}
            accessibilityLabel={prefTheme === "dark" ? c.darkModeOn : c.darkModeOff}
            accessibilityRole="button"
          >
            {theme === "dark" ? (
              <Sun color={colors.foreground} size={18} />
            ) : (
              <Moon color={colors.foreground} size={18} />
            )}
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push("/thong-bao")}
            accessibilityLabel={c.notificationsA11y}
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

      <View style={[styles.heroWrap, isLandscape && { minHeight: 240 }]}>
        <ImageBackground source={SECURITY_HERO} style={{ flex: 1 }} imageStyle={{ opacity: 0.9 }}>
          <LinearGradient
            colors={["#071A3DE6", "#071A3DCC", "#071A3D33"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          >
            <View style={styles.heroInner}>
              <View style={styles.heroBadge}>
                <ShieldCheck color="rgba(255,255,255,0.8)" size={14} />
                <Text style={styles.heroBadgeText}>{h.heroBadge}</Text>
              </View>
              <Text style={styles.heroTitle}>{h.heroTitle}</Text>
              <View style={styles.badgeRow}>
                <FeatureBadge Icon={ShieldCheck} title={h.quickSupport} sub="24/7" />
                <FeatureBadge Icon={Clock} title={h.quickArrival} sub={h.quickArrivalSub} />
                <FeatureBadge Icon={UserCheck} title={h.proTeam} sub={h.proTeamSub} />
              </View>
              <Pressable style={styles.sosBtn} onPress={() => router.push("/(tabs)/bao-an")}>
                <View style={styles.ctaIcon}>
                  <Phone color={colors.white} size={20} fill={colors.white} />
                </View>
                <View>
                  <Text style={styles.sosTitle}>{h.callNow}</Text>
                  <Text style={styles.sosSub}>{h.callNowSub}</Text>
                </View>
              </Pressable>
              <Pressable style={styles.chatBtn} onPress={() => router.push("/bao-an/chat")}>
                <View style={styles.ctaIcon}>
                  <MessageSquare color={colors.white} size={20} />
                </View>
                <View>
                  <Text style={styles.chatTitle}>{h.chatSecurity}</Text>
                  <Text style={styles.chatSub}>{h.chatSecuritySub}</Text>
                </View>
              </Pressable>
              <View style={styles.pill247}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                <Text style={styles.pill247Text}>{h.support247}</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      <Pressable
        style={[styles.securityCard, { borderColor: securityBorder }]}
        onPress={() => router.push("/(tabs)/bao-an")}
      >
        <View style={styles.securityTop}>
          <View style={styles.securityMain}>
            <View style={[styles.securityIcon, { backgroundColor: securityStyle.chip }]}>
              <ShieldCheck color={securityStyle.text} size={20} />
              {securityTone !== "success" && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: securityStyle.dot,
                    borderWidth: 2,
                    borderColor: colors.card,
                  }}
                />
              )}
            </View>
            <View style={styles.securityTextBlock}>
              <Text style={styles.securityLabel}>{h.securityStatus}</Text>
              <Text style={[styles.securityHeadline, { color: securityStyle.headline }]} numberOfLines={2}>
                {securityHeadline}
              </Text>
              <Text style={styles.securitySub} numberOfLines={1}>
                {securityUpdated}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.securityDivider} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
        >
          {securityChips.map((c) => {
            const Icon = SECURITY_CHIP_ICONS[c.key] ?? ShieldCheck;
            const chipStyle = securityToneStyle(colors, c.tone);
            return (
              <View key={c.key} style={styles.chipItem}>
                <View style={styles.chipIconWrap}>
                  <View style={[styles.chipIcon, { backgroundColor: chipStyle.chip }]}>
                    <Icon color={chipStyle.text} size={16} />
                  </View>
                  {c.count > 0 && (
                    <View style={[styles.chipCount, { backgroundColor: chipStyle.dot }]}>
                      <Text style={styles.chipCountText}>{c.count}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.chipTextBlock}>
                  <Text style={styles.chipLabel} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text
                    style={[styles.chipValue, { color: c.tone === "success" ? colors.muted : chipStyle.text }]}
                    numberOfLines={1}
                  >
                    {c.value}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </Pressable>

      <Card style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
          {h.securityServices}
        </Text>
        <View style={styles.servicesGrid}>
          {services.map((svc) => {
            const Icon = svc.Icon;
            const iconColor = colorFromKey(colors, svc.colorKey);
            const bg = colorFromKey(colors, svc.bgKey);
            return (
              <Pressable
                key={svc.id}
                style={[styles.serviceCell, { width: isLandscape ? "16.666%" : "33.33%" }]}
                onPress={() => router.push(svc.href)}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: bg }]}>
                  {svc.id === "sos" ? (
                    <View style={styles.sosCircle}>
                      <Text style={styles.sosCircleText}>SOS</Text>
                    </View>
                  ) : (
                    <Icon color={iconColor} size={28} strokeWidth={2.2} />
                  )}
                </View>
                <Text style={styles.serviceLabel}>
                  {svc.label}
                  {svc.sub ? `\n${svc.sub}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <View style={styles.cardHeader}>
          <SectionTitle>{h.familyToday}</SectionTitle>
          <Pressable onPress={() => router.push("/(tabs)/gia-dinh")} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.link}>{c.seeAll}</Text>
            <ChevronRight color={colors.brand} size={14} />
          </Pressable>
        </View>
        {todayQ.isLoading || !familyId ? (
          <>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
          </>
        ) : todayMembers.length === 0 ? (
          <>
            <Text style={styles.muted}>{h.noMembers}</Text>
            <Pressable onPress={() => router.push("/(tabs)/gia-dinh")} style={{ alignItems: "center", marginTop: 8 }}>
              <Text style={styles.link}>{c.addMember}</Text>
            </Pressable>
          </>
        ) : (
          todayMembers.map((m) => <FamilyMemberRow key={m.id} member={m} />)
        )}
      </Card>

      <Card style={{ marginTop: 16, marginBottom: 24 }}>
        <View style={styles.cardHeader}>
          <SectionTitle>{h.recentActivity}</SectionTitle>
          <Pressable onPress={() => router.push("/thong-bao")} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.link}>{c.seeAll}</Text>
            <ChevronRight color={colors.brand} size={14} />
          </Pressable>
        </View>
        {activitiesQ.isLoading ? (
          <>
            <View style={[styles.skeleton, { height: 48 }]} />
            <View style={[styles.skeleton, { height: 48 }]} />
          </>
        ) : activitiesQ.isError ? (
          <Text style={styles.muted}>{h.activityLoadError}</Text>
        ) : activities.length === 0 ? (
          <Text style={styles.muted}>{h.noActivity}</Text>
        ) : (
          <>
            {activities.map((a) => {
              const v = getActivityVisual(a.type);
              const ActIcon = v.Icon;
              return (
                <View key={a.id} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: colorFromKey(colors, v.bgKey) }]}>
                    <ActIcon color={colorFromKey(colors, v.colorKey)} size={16} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {a.title}
                    </Text>
                    {a.body ? (
                      <Text style={styles.activityBody} numberOfLines={1}>
                        {a.body}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.activityTime}>{formatActivityTime(a.created_at, locale)}</Text>
                  {!a.read_at && <View style={styles.unreadDot} />}
                </View>
              );
            })}
            {hasMore && (
              <Pressable
                style={styles.loadMore}
                disabled={activitiesQ.isFetching}
                onPress={() => setPageCount((p) => p + 1)}
              >
                {activitiesQ.isFetching ? (
                  <>
                    <Loader2 color={colors.foreground} size={14} />
                    <Text style={styles.loadMoreText}>{c.loading}</Text>
                  </>
                ) : (
                  <Text style={styles.loadMoreText}>
                    {c.loadMore(activities.length, total)}
                  </Text>
                )}
              </Pressable>
            )}
            {showCollapse && (
              <Pressable
                style={styles.loadMore}
                disabled={activitiesQ.isFetching}
                onPress={() => setPageCount(1)}
              >
                <Text style={styles.loadMoreText}>{c.showLess}</Text>
              </Pressable>
            )}
          </>
        )}
      </Card>
    </Screen>
  );
}
