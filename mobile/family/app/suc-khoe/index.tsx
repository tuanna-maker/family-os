import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Brain,
  ChevronLeft,
  ChevronRight,
  FolderHeart,
  Heart,
  MessageCircle,
  Pill,
  Plus,
  Shield,
  ShieldCheck,
  Stethoscope,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { HealthRecordTiles } from "@mobile/components/health/HealthRecordTiles";
import {
  MEMBER_AVATAR_URL,
  PILOT_ACTIVITY,
  PILOT_APPTS,
  PILOT_INSIGHTS,
  PILOT_MEDS,
  avatarFor,
  isApptUpcoming,
} from "@mobile/components/health/healthVisuals";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listHealth } from "@mobile/api/health";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatApptTime, formatMedCountdown } from "@mobile/i18n/format";

export default function SucKhoeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useHealthStyles();
  const { locale, s } = useI18n();
  const c = s.common;
  const h = s.screens.health;
  const ov = h.overview;
  const cal = s.screens.calendar;
  const { familyId } = useFamilyContext();
  const [activeMember, setActiveMember] = useState("all");

  const quickActions = useMemo(
    (): {
      icon: LucideIcon;
      label: string;
      tintKey: "tintBlue" | "tintGreen" | "tintPurple" | "tintOrange";
      colorKey: "brand" | "success" | "pink" | "warning";
      href: string;
    }[] => [
      { icon: Stethoscope, label: h.bookAppt, tintKey: "tintBlue", colorKey: "brand", href: "/suc-khoe/dat-lich" },
      { icon: MessageCircle, label: ov.consultDoctor, tintKey: "tintGreen", colorKey: "success", href: "/suc-khoe/tu-van" },
      { icon: Pill, label: h.medicine, tintKey: "tintPurple", colorKey: "pink", href: "/suc-khoe/nhac-thuoc" },
      { icon: FolderHeart, label: h.profile, tintKey: "tintOrange", colorKey: "warning", href: "/suc-khoe/ho-so" },
    ],
    [h, ov],
  );

  const vitals = useMemo(
    () => [
      { key: "heart", icon: Heart, label: ov.heartRateAvg, value: "72", unit: "bpm", status: ov.normal },
      { key: "sleep", icon: Shield, label: ov.sleepAvg, value: "7h 32m", unit: "", status: ov.good },
      { key: "steps", icon: ShieldCheck, label: ov.stepsAvg, value: "8.245", unit: "", status: ov.good },
      { key: "energy", icon: Heart, label: ov.energy, value: "85", unit: "/100", status: ov.good },
    ],
    [ov],
  );

  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: 60_000,
  });

  const data = q.data;
  const usingPilot = !data || ((data.meds?.length ?? 0) === 0 && (data.appts?.length ?? 0) === 0);

  const members = useMemo(() => {
    const names = new Set<string>();
    data?.profiles?.forEach((p) => names.add(p.name));
    data?.meds?.forEach((m) => names.add(m.member_name));
    data?.appts?.forEach((a) => names.add(a.member_name));
    if (names.size === 0) ["Anh Hùng", "Chị Lan", "Bé Minh", "Bà Ngoại"].forEach((n) => names.add(n));
    return Array.from(names);
  }, [data]);

  const memberTabs = useMemo(
    () => [
      { id: "all", name: cal.groups.all, img: MEMBER_AVATAR_URL["Cả nhà"] },
      ...members.map((name) => ({
        id: name,
        name,
        img: MEMBER_AVATAR_URL[name],
        emoji: avatarFor(name),
      })),
    ],
    [members, cal.groups.all],
  );

  const filterMember = <T extends { member_name?: string; name?: string }>(rows: T[]) =>
    activeMember === "all" ? rows : rows.filter((r) => (r.name ?? r.member_name) === activeMember);

  const upcomingAppts = useMemo(() => {
    const source = (data?.appts?.length ? data.appts : PILOT_APPTS).filter(isApptUpcoming);
    return filterMember(source).slice(0, 2);
  }, [data, activeMember]);

  const todayMeds = useMemo(() => {
    const source = (data?.meds?.length ? data.meds : PILOT_MEDS).filter((m) => m.active && m.time_of_day);
    return filterMember(source).slice(0, 3);
  }, [data, activeMember]);

  const notifCount = upcomingAppts.length + todayMeds.length;

  const recordCounts = useMemo(() => {
    const recs = filterMember(
      (data?.records ?? []) as Array<{ kind?: string; title?: string; member_name?: string; name?: string }>,
    );
    const profs = filterMember(data?.profiles ?? []);
    const medsAll = filterMember(data?.meds?.length ? data.meds : PILOT_MEDS).filter((m) => m.active);
    const apptsAll = filterMember(data?.appts?.length ? data.appts : PILOT_APPTS);
    return {
      tests: recs.length || (usingPilot ? 2 : 0),
      meds: medsAll.length,
      appts: apptsAll.length,
      allergies: profs.filter((p) => (p as { allergies?: string }).allergies?.trim()).length || (usingPilot ? 2 : 0),
      conditions: profs.filter((p) => (p as { conditions?: string }).conditions?.trim()).length || (usingPilot ? 1 : 0),
    };
  }, [data, activeMember, usingPilot]);

  const insights = useMemo(() => {
    if (!data || usingPilot) return PILOT_INSIGHTS;
    const out: { emoji: string; text: string }[] = [];
    const missing = members.filter((n) => !data.profiles.some((p) => p.name === n));
    if (missing.length > 0) {
      out.push({ emoji: "📝", text: ov.membersNoProfile(missing.length) });
    }
    if (upcomingAppts.length > 0) {
      out.push({ emoji: "🩺", text: ov.apptsThisWeek(upcomingAppts.length) });
    }
    const allergyProfiles = data.profiles.filter((p) => (p as { allergies?: string }).allergies?.trim());
    if (allergyProfiles.length > 0) {
      out.push({ emoji: "⚠️", text: ov.membersWithAllergy(allergyProfiles.length) });
    }
    return out.length > 0 ? out : PILOT_INSIGHTS;
  }, [data, members, upcomingAppts, usingPilot, ov]);

  const activity = useMemo(() => {
    if (usingPilot) return PILOT_ACTIVITY;
    const items: { emoji: string; text: string; time: string }[] = [];
    for (const a of upcomingAppts.slice(0, 1)) {
      items.push({
        emoji: "📅",
        text: ov.activityAppt(a.member_name, a.doctor),
        time: formatApptTime(a.scheduled_at, locale).split(" · ")[0] ?? ov.upcoming,
      });
    }
    for (const m of todayMeds.slice(0, 1)) {
      items.push({
        emoji: "💊",
        text: ov.activityMed(m.member_name, m.medicine),
        time: (m.time_of_day ?? "08:00").slice(0, 5),
      });
    }
    return items.length > 0 ? items : PILOT_ACTIVITY;
  }, [usingPilot, upcomingAppts, todayMeds, ov, locale]);

  if (q.isLoading) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.push("/(tabs)/gia-dinh")}>
          <ChevronLeft color={colors.foreground} size={22} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.pageTitle}>{h.title}</Text>
          <View style={styles.subRow}>
            <Shield color={colors.brand} size={14} />
            <Text style={styles.subtitle}>{ov.tagline}</Text>
          </View>
        </View>
        <Pressable style={styles.bellBtn} onPress={() => router.push("/suc-khoe/nhac-thuoc" as never)}>
          <Bell color={colors.foreground} size={18} />
          {notifCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{notifCount > 9 ? "9+" : notifCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.memberRow}>
          {memberTabs.map((m) => {
            const active = activeMember === m.id;
            return (
              <Pressable key={m.id} style={styles.memberTab} onPress={() => setActiveMember(m.id)}>
                <View style={[styles.memberAvatar, active && styles.memberAvatarActive]}>
                  {m.img ? (
                    <Image source={{ uri: m.img }} style={styles.memberImg} />
                  ) : (
                    <Text style={styles.memberEmoji}>{(m as { emoji?: string }).emoji ?? "👤"}</Text>
                  )}
                </View>
                <Text style={[styles.memberLabel, active && styles.memberLabelActive]} numberOfLines={1}>
                  {m.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.memberTab} onPress={() => router.push("/suc-khoe/them?type=profile" as never)}>
            <View style={[styles.memberAvatar, styles.addAvatar]}>
              <Plus color={colors.muted} size={22} />
            </View>
            <Text style={styles.memberLabel}>{c.add}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Card style={styles.statusCard}>
        <Text style={styles.statusTitle}>{ov.statusTitle}</Text>
        <View style={styles.statusRow}>
          <ShieldCheck color={notifCount === 0 ? colors.success : colors.warning} size={24} />
          <Text style={[styles.statusValue, { color: notifCount === 0 ? colors.success : colors.warning }]}>
            {notifCount === 0 ? ov.stable : ov.needsAttention}
          </Text>
        </View>
        <Text style={styles.statusHint}>
          {notifCount === 0 ? ov.noAlerts : ov.tasksToTrack(notifCount)}
        </Text>
        <Pressable onPress={() => router.push("/suc-khoe/ho-so" as never)}>
          <Text style={styles.statusLink}>{ov.manageProfileLink}</Text>
        </Pressable>
        <View style={styles.vitalsGrid}>
          {vitals.map((v) => {
            const Icon = v.icon;
            return (
              <View key={v.key} style={styles.vitalTile}>
                <View style={styles.vitalHead}>
                  <View style={[styles.vitalIcon, { backgroundColor: colors.tintBlue }]}>
                    <Icon color={colors.brand} size={14} />
                  </View>
                  <Text style={styles.vitalLabel}>{v.label}</Text>
                </View>
                <Text style={styles.vitalValue}>
                  {v.value}
                  {v.unit ? <Text style={styles.vitalUnit}> {v.unit}</Text> : null}
                </Text>
                <Text style={styles.vitalStatus}>● {v.status}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>{ov.quickActions}</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((a) => (
          <Pressable
            key={a.href}
            style={styles.quickTile}
            onPress={() => router.push(a.href as never)}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors[a.tintKey], borderColor: colors.cardBorder }]}>
              <a.icon color={colors[a.colorKey]} size={22} strokeWidth={2.2} />
            </View>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.twoCol}>
        <Card style={styles.halfCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{ov.upcomingAppts}</Text>
            <Pressable onPress={() => router.push("/suc-khoe/lich-kham" as never)}>
              <Text style={styles.cardLink}>{c.seeAll}</Text>
            </Pressable>
          </View>
          {upcomingAppts.length === 0 ? (
            <Text style={styles.emptyText}>{ov.noUpcomingAppt}</Text>
          ) : (
            upcomingAppts.map((a) => (
              <Pressable
                key={a.id}
                style={styles.listItem}
                onPress={() => router.push("/suc-khoe/dat-lich" as never)}
              >
                <Text style={styles.listEmoji}>{avatarFor(a.member_name)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {a.doctor ?? ov.generalCheckup}
                  </Text>
                  <Text style={styles.listSub} numberOfLines={1}>
                    👤 {a.member_name}
                  </Text>
                  <Text style={styles.listSub}>{formatApptTime(a.scheduled_at, locale)}</Text>
                </View>
                <ChevronRight color={colors.muted} size={14} />
              </Pressable>
            ))
          )}
        </Card>

        <Card style={styles.halfCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{ov.medReminders}</Text>
            <Pressable onPress={() => router.push("/suc-khoe/nhac-thuoc" as never)}>
              <Text style={styles.cardLink}>{c.seeAll}</Text>
            </Pressable>
          </View>
          {todayMeds.length === 0 ? (
            <Text style={styles.emptyText}>{ov.noMedReminder}</Text>
          ) : (
            todayMeds.map((m) => (
              <Pressable
                key={m.id}
                style={styles.listItem}
                onPress={() => router.push("/suc-khoe/nhac-thuoc" as never)}
              >
                <Text style={styles.listEmoji}>{avatarFor(m.member_name)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {m.medicine}
                  </Text>
                  <Text style={styles.listSub} numberOfLines={1}>
                    {m.member_name}
                  </Text>
                  <Text style={styles.listSub}>
                    {ov.medRemaining(formatMedCountdown(m.time_of_day, locale))}
                  </Text>
                </View>
                <Text style={styles.medTime}>{(m.time_of_day ?? "08:00").slice(0, 5)}</Text>
              </Pressable>
            ))
          )}
        </Card>
      </View>

      <View style={[styles.insightCard, { backgroundColor: colors.tintPurple, borderColor: colors.pink }]}>
        <View style={[styles.insightIcon, { backgroundColor: colors.tintPink }]}>
          <Brain color={colors.pink} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.insightTitle, { color: colors.pink }]}>{ov.healthSummary}</Text>
          {insights.map((i, k) => (
            <Text key={k} style={styles.insightLine}>
              {i.emoji} {i.text}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{ov.healthRecords}</Text>
        <Pressable onPress={() => router.push("/suc-khoe/ho-so" as never)}>
          <Text style={styles.cardLink}>{c.seeAll}</Text>
        </Pressable>
      </View>
      <View style={{ marginBottom: 20 }}>
        <HealthRecordTiles counts={recordCounts} />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{ov.recentActivity}</Text>
        <Pressable onPress={() => router.push("/suc-khoe/hoat-dong" as never)}>
          <Text style={styles.cardLink}>{c.seeAll}</Text>
        </Pressable>
      </View>
      {activity.map((a, i) => (
        <Pressable key={i} onPress={() => router.push("/suc-khoe/hoat-dong" as never)}>
          <Card style={styles.activityRow}>
            <Text style={styles.activityEmoji}>{a.emoji}</Text>
            <Text style={styles.activityText}>{a.text}</Text>
            <Text style={styles.activityTime}>{a.time}</Text>
          </Card>
        </Pressable>
      ))}

      {usingPilot && (
        <Text style={styles.pilotHint}>{ov.pilotHint}</Text>
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useHealthStyles() {
  return useThemedStyles((c, fontScale) => ({
    header: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, marginBottom: 16 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    pageTitle: { fontSize: 22 * fontScale, fontWeight: "800" as const, color: c.foreground, letterSpacing: -0.3 },
    subRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 4 },
    subtitle: { fontSize: 11 * fontScale, color: c.muted },
    bellBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    bellBadge: {
      position: "absolute" as const,
      top: 6,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.emergency,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 3,
    },
    bellBadgeText: { color: c.white, fontSize: 9, fontWeight: "800" as const },
    memberRow: { flexDirection: "row" as const, gap: 14, paddingBottom: 4 },
    memberTab: { alignItems: "center" as const, width: 64 },
    memberAvatar: {
      width: 60,
      height: 60,
      borderRadius: radius.md,
      overflow: "hidden" as const,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    memberAvatarActive: { borderWidth: 2, borderColor: c.brand },
    memberImg: { width: 60, height: 60 },
    memberEmoji: { fontSize: 28 },
    addAvatar: { borderWidth: 1, borderColor: c.cardBorder, borderStyle: "dashed" as const },
    memberLabel: { fontSize: 11 * fontScale, color: c.muted, marginTop: 6, fontWeight: "500" as const, maxWidth: 64, textAlign: "center" as const },
    memberLabelActive: { color: c.foreground, fontWeight: "700" as const },
    statusCard: { marginBottom: 20, ...cardShadow(c) },
    statusTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    statusRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginTop: 8 },
    statusValue: { fontSize: 28 * fontScale, fontWeight: "800" as const },
    statusHint: { fontSize: 11 * fontScale, color: c.muted, marginTop: 6 },
    statusLink: { fontSize: 11 * fontScale, color: c.brand, fontWeight: "700" as const, marginTop: 6 },
    vitalsGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginTop: 14 },
    vitalTile: {
      width: "47%" as const,
      backgroundColor: c.mutedBg,
      borderRadius: radius.md,
      padding: 10,
    },
    vitalHead: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    vitalIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center" as const, justifyContent: "center" as const },
    vitalLabel: { fontSize: 10 * fontScale, color: c.muted, flex: 1 },
    vitalValue: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 8 },
    vitalUnit: { fontSize: 12 * fontScale, fontWeight: "500" as const, color: c.muted },
    vitalStatus: { fontSize: 10 * fontScale, color: c.success, marginTop: 6 },
    sectionTitle: { fontSize: 15 * fontScale, fontWeight: "800" as const, color: c.foreground, marginBottom: 12 },
    sectionHead: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 12 },
    quickGrid: { flexDirection: "row" as const, gap: 8, marginBottom: 20 },
    quickTile: { flex: 1, alignItems: "center" as const, gap: 6 },
    quickIcon: {
      width: "100%" as const,
      height: 56,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    quickLabel: { fontSize: 10 * fontScale, fontWeight: "500" as const, color: c.foreground, textAlign: "center" as const },
    twoCol: { flexDirection: "row" as const, gap: 10, marginBottom: 20 },
    halfCard: { flex: 1, padding: 12, minHeight: 160 },
    cardHead: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 },
    cardTitle: { fontSize: 13 * fontScale, fontWeight: "700" as const, color: c.foreground },
    cardLink: { fontSize: 10 * fontScale, fontWeight: "700" as const, color: c.brand },
    emptyText: { fontSize: 11 * fontScale, color: c.muted },
    listItem: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, marginBottom: 10 },
    listEmoji: { fontSize: 22, width: 36, textAlign: "center" as const },
    listTitle: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.foreground },
    listSub: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    medTime: { fontSize: 13 * fontScale, fontWeight: "700" as const, color: c.success },
    insightCard: {
      flexDirection: "row" as const,
      gap: 12,
      padding: 14,
      borderRadius: radius.xl,
      borderWidth: 1,
      marginBottom: 20,
    },
    insightIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center" as const, justifyContent: "center" as const },
    insightTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, marginBottom: 6 },
    insightLine: { fontSize: 11 * fontScale, color: c.foreground, lineHeight: 16, marginTop: 4 },
    activityRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 8, padding: 12 },
    activityEmoji: { fontSize: 18 },
    activityText: { flex: 1, fontSize: 12 * fontScale, color: c.foreground },
    activityTime: { fontSize: 11 * fontScale, color: c.muted },
    pilotHint: { fontSize: 11 * fontScale, color: c.muted, textAlign: "center" as const, marginTop: 8, fontStyle: "italic" as const },
  }));
}
