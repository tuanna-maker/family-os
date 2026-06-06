import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Brain,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileHeart,
  FolderHeart,
  Heart,
  MessageCircle,
  Pill,
  Plus,
  Shield,
  ShieldCheck,
  Stethoscope,
  Syringe,
  TestTube,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import {
  MEMBER_AVATAR_URL,
  PILOT_ACTIVITY,
  PILOT_APPTS,
  PILOT_INSIGHTS,
  PILOT_MEDS,
  avatarFor,
  formatApptShort,
  isApptUpcoming,
  medCountdown,
} from "@mobile/components/health/healthVisuals";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listHealth } from "@mobile/api/health";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";

const QUICK_ACTIONS: {
  icon: LucideIcon;
  label: string;
  tintKey: "tintBlue" | "tintGreen" | "tintPurple" | "tintOrange";
  colorKey: "brand" | "success" | "pink" | "warning";
  href?: string;
}[] = [
  { icon: Stethoscope, label: "Đặt lịch khám", tintKey: "tintBlue", colorKey: "brand", href: "/suc-khoe/quan-ly" },
  { icon: MessageCircle, label: "Tư vấn bác sĩ", tintKey: "tintGreen", colorKey: "success" },
  { icon: Pill, label: "Nhắc uống thuốc", tintKey: "tintPurple", colorKey: "pink", href: "/suc-khoe/quan-ly" },
  { icon: FolderHeart, label: "Hồ sơ sức khỏe", tintKey: "tintOrange", colorKey: "warning", href: "/suc-khoe/quan-ly" },
];

const VITALS = [
  { key: "heart", icon: Heart, label: "Nhịp tim TB", value: "72", unit: "bpm", status: "Bình thường" },
  { key: "sleep", icon: Shield, label: "Giấc ngủ TB", value: "7h 32m", unit: "", status: "Tốt" },
  { key: "steps", icon: ShieldCheck, label: "Số bước TB", value: "8.245", unit: "", status: "Tốt" },
  { key: "energy", icon: Heart, label: "Năng lượng", value: "85", unit: "/100", status: "Tốt" },
];

export default function SucKhoeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useHealthStyles();
  const { familyId } = useFamilyContext();
  const [activeMember, setActiveMember] = useState("all");

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
      { id: "all", name: "Cả nhà", img: MEMBER_AVATAR_URL["Cả nhà"] },
      ...members.map((name) => ({
        id: name,
        name,
        img: MEMBER_AVATAR_URL[name],
        emoji: avatarFor(name),
      })),
    ],
    [members],
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
    const recs = filterMember((data?.records ?? []) as Array<{ kind?: string; title?: string }>);
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
      out.push({ emoji: "📝", text: `${missing.length} thành viên chưa có hồ sơ sức khỏe.` });
    }
    if (upcomingAppts.length > 0) {
      out.push({ emoji: "🩺", text: `${upcomingAppts.length} lịch khám sắp tới trong tuần.` });
    }
    const allergies = data.profiles.filter((p) => (p as { allergies?: string }).allergies?.trim());
    if (allergies.length > 0) {
      out.push({ emoji: "⚠️", text: `${allergies.length} thành viên có ghi nhận dị ứng.` });
    }
    return out.length > 0 ? out : PILOT_INSIGHTS;
  }, [data, members, upcomingAppts, usingPilot]);

  const activity = useMemo(() => {
    if (usingPilot) return PILOT_ACTIVITY;
    const items: { emoji: string; text: string; time: string }[] = [];
    for (const a of upcomingAppts.slice(0, 1)) {
      items.push({
        emoji: "📅",
        text: `Lịch khám ${a.member_name}${a.doctor ? ` — ${a.doctor}` : ""}`,
        time: formatApptShort(a.scheduled_at).split(" • ")[0] ?? "Sắp tới",
      });
    }
    for (const m of todayMeds.slice(0, 1)) {
      items.push({
        emoji: "💊",
        text: `${m.member_name} uống ${m.medicine}`,
        time: (m.time_of_day ?? "08:00").slice(0, 5),
      });
    }
    return items.length > 0 ? items : PILOT_ACTIVITY;
  }, [usingPilot, upcomingAppts, todayMeds]);

  if (q.isLoading) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.push("/(tabs)/gia-dinh")}>
          <ChevronLeft color={colors.foreground} size={22} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.pageTitle}>Sức khỏe gia đình</Text>
          <View style={styles.subRow}>
            <Shield color={colors.brand} size={14} />
            <Text style={styles.subtitle}>Chăm sóc sức khỏe – An tâm mỗi ngày</Text>
          </View>
        </View>
        <Pressable style={styles.bellBtn} onPress={() => router.push("/suc-khoe/quan-ly")}>
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
          <Pressable style={styles.memberTab} onPress={() => router.push("/suc-khoe/quan-ly")}>
            <View style={[styles.memberAvatar, styles.addAvatar]}>
              <Plus color={colors.muted} size={22} />
            </View>
            <Text style={styles.memberLabel}>Thêm</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Card style={styles.statusCard}>
        <Text style={styles.statusTitle}>Tình trạng sức khỏe tổng quan</Text>
        <View style={styles.statusRow}>
          <ShieldCheck color={notifCount === 0 ? colors.success : colors.warning} size={24} />
          <Text style={[styles.statusValue, { color: notifCount === 0 ? colors.success : colors.warning }]}>
            {notifCount === 0 ? "Ổn định" : "Cần chú ý"}
          </Text>
        </View>
        <Text style={styles.statusHint}>
          {notifCount === 0
            ? "Không có cảnh báo nào."
            : `${notifCount} việc cần theo dõi trong 24h tới`}
        </Text>
        <Pressable onPress={() => router.push("/suc-khoe/quan-ly")}>
          <Text style={styles.statusLink}>Quản lý hồ sơ chi tiết →</Text>
        </Pressable>
        <View style={styles.vitalsGrid}>
          {VITALS.map((v) => {
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

      <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={styles.quickTile}
            onPress={() => a.href && router.push(a.href as never)}
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
            <Text style={styles.cardTitle}>Lịch khám sắp tới</Text>
            <Pressable onPress={() => router.push("/suc-khoe/quan-ly")}>
              <Text style={styles.cardLink}>Xem tất cả</Text>
            </Pressable>
          </View>
          {upcomingAppts.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lịch khám sắp tới.</Text>
          ) : (
            upcomingAppts.map((a) => (
              <View key={a.id} style={styles.listItem}>
                <Text style={styles.listEmoji}>{avatarFor(a.member_name)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {a.doctor ?? "Khám tổng quát"}
                  </Text>
                  <Text style={styles.listSub} numberOfLines={1}>
                    👤 {a.member_name}
                  </Text>
                  <Text style={styles.listSub}>{formatApptShort(a.scheduled_at)}</Text>
                </View>
                <ChevronRight color={colors.muted} size={14} />
              </View>
            ))
          )}
        </Card>

        <Card style={styles.halfCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Nhắc uống thuốc</Text>
            <Pressable onPress={() => router.push("/suc-khoe/quan-ly")}>
              <Text style={styles.cardLink}>Xem tất cả</Text>
            </Pressable>
          </View>
          {todayMeds.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có nhắc thuốc.</Text>
          ) : (
            todayMeds.map((m) => (
              <View key={m.id} style={styles.listItem}>
                <Text style={styles.listEmoji}>{avatarFor(m.member_name)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {m.medicine}
                  </Text>
                  <Text style={styles.listSub} numberOfLines={1}>
                    {m.member_name}
                  </Text>
                  <Text style={styles.listSub}>Còn {medCountdown(m.time_of_day)}</Text>
                </View>
                <Text style={styles.medTime}>{(m.time_of_day ?? "08:00").slice(0, 5)}</Text>
              </View>
            ))
          )}
        </Card>
      </View>

      <View style={[styles.insightCard, { backgroundColor: colors.tintPurple, borderColor: colors.pink }]}>
        <View style={[styles.insightIcon, { backgroundColor: colors.tintPink }]}>
          <Brain color={colors.pink} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.insightTitle, { color: colors.pink }]}>Tổng hợp sức khỏe</Text>
          {insights.map((i, k) => (
            <Text key={k} style={styles.insightLine}>
              {i.emoji} {i.text}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Hồ sơ sức khỏe</Text>
        <Pressable onPress={() => router.push("/suc-khoe/quan-ly")}>
          <Text style={styles.cardLink}>Xem tất cả</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.recordRow}>
          <RecordTile icon={TestTube} label="Chỉ số" detail={`${recordCounts.tests} bản ghi`} onPress={() => router.push("/suc-khoe/quan-ly")} />
          <RecordTile icon={ClipboardList} label="Đơn thuốc" detail={`${recordCounts.meds} đang dùng`} onPress={() => router.push("/suc-khoe/quan-ly")} />
          <RecordTile icon={Syringe} label="Lịch khám" detail={`${recordCounts.appts} mục`} onPress={() => router.push("/suc-khoe/quan-ly")} />
          <RecordTile icon={AlertTriangle} label="Dị ứng" detail={`${recordCounts.allergies} ghi nhận`} onPress={() => router.push("/suc-khoe/quan-ly")} />
          <RecordTile icon={FileHeart} label="Bệnh nền" detail={`${recordCounts.conditions} ghi nhận`} onPress={() => router.push("/suc-khoe/quan-ly")} />
        </View>
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
        <Pressable onPress={() => router.push("/suc-khoe/quan-ly")}>
          <Text style={styles.cardLink}>Xem tất cả</Text>
        </Pressable>
      </View>
      {activity.map((a, i) => (
        <Card key={i} style={styles.activityRow}>
          <Text style={styles.activityEmoji}>{a.emoji}</Text>
          <Text style={styles.activityText}>{a.text}</Text>
          <Text style={styles.activityTime}>{a.time}</Text>
        </Card>
      ))}

      {usingPilot && (
        <Text style={styles.pilotHint}>Dữ liệu mẫu — thêm hồ sơ thật trong Quản lý sức khỏe</Text>
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function RecordTile({
  icon: Icon,
  label,
  detail,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useHealthStyles();
  return (
    <Pressable style={[styles.recordTile, { borderColor: colors.cardBorder, backgroundColor: colors.card }]} onPress={onPress}>
      <Icon color={colors.pink} size={22} strokeWidth={2.2} />
      <Text style={styles.recordLabel}>{label}</Text>
      <Text style={styles.recordDetail}>{detail}</Text>
    </Pressable>
  );
}

function useHealthStyles() {
  return useThemedStyles((c, fontScale) => ({
    header: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, marginBottom: 16, paddingTop: 8 },
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
    recordRow: { flexDirection: "row" as const, gap: 8 },
    recordTile: {
      width: 88,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: 10,
      alignItems: "center" as const,
      gap: 4,
      ...cardShadow(c),
    },
    recordLabel: { fontSize: 10 * fontScale, fontWeight: "700" as const, color: c.foreground, textAlign: "center" as const },
    recordDetail: { fontSize: 9 * fontScale, color: c.muted, textAlign: "center" as const },
    activityRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 8, padding: 12 },
    activityEmoji: { fontSize: 18 },
    activityText: { flex: 1, fontSize: 12 * fontScale, color: c.foreground },
    activityTime: { fontSize: 11 * fontScale, color: c.muted },
    pilotHint: { fontSize: 11 * fontScale, color: c.muted, textAlign: "center" as const, marginTop: 8, fontStyle: "italic" as const },
  }));
}
