import { useMemo, useState, useCallback } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Moon,
  Pencil,
  Plus,
  Activity,
  Star,
  FolderOpen,
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import { listChildren } from "@mobile/api/children";
import { listChildAlbums } from "@mobile/api/child-albums";
import { LoadingState, EmptyState, ErrorState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useSignedStorageUrls } from "@mobile/hooks/useSignedStorageUrls";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import { childAvatarDisplay } from "@mobile/utils/childAvatar";

const CHILD_ACCENTS = ["#EC4899", "#A855F7", "#22C55E", "#3B82F6"] as const;

function childAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 112;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(score, 10) / 10);
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export function ChildrenCompanionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { s } = useI18n();
  const ch = s.screens.children;
  const c = s.common;
  const aiIcon = useMemo(() => require("../../../assets/gemini-1781685677184-Photoroom.png"), []);
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const activeChildId = useMemo(() => {
    if (!q.data?.children.length) return null;
    if (selectedChild && q.data.children.some((x) => x.id === selectedChild)) return selectedChild;
    return q.data.children[0]?.id ?? null;
  }, [q.data, selectedChild]);

  const albumsQ = useQuery({
    queryKey: ["child-albums", familyId, activeChildId],
    queryFn: () => listChildAlbums({ family_id: familyId!, child_id: activeChildId! }),
    enabled: !!familyId && !!activeChildId,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      if (!familyId) return;
      void qc.invalidateQueries({ queryKey: ["child-albums", familyId] });
    }, [qc, familyId]),
  );

  const activeChild = q.data?.children.find((x) => x.id === activeChildId) ?? null;
  const childName = activeChild?.name ?? "Bé";
  const allAlbums = albumsQ.data?.albums ?? [];
  const signedCovers = useSignedStorageUrls(
    "child-moments",
    allAlbums.map((a) => a.cover_url),
  );
  const resolveCover = (url: string | null) =>
    url ? (signedCovers.data?.get(url) ?? url) : null;

  const metrics = useMemo(() => {
    const hw = (q.data?.homeworks ?? []).filter((h) => h.child_id === activeChildId);
    const done = hw.filter((h) => h.done).length;
    const learn = hw.length ? 7 + (done / hw.length) * 2.5 : 8.5;
    const overall = (learn + 8 + 7.8 + 8.7) / 4;
    return {
      overall: Math.min(10, Math.round(overall * 10) / 10),
      learn: Math.round(learn * 10) / 10,
      emotion: 8.0,
      physical: 7.8,
      sleep: 8.7,
    };
  }, [q.data?.homeworks, activeChildId]);

  const taskCards = useMemo(() => {
    if (!activeChildId || !activeChild) return [];
    const cards: Array<{
      key: string;
      tone: string;
      title: string;
      sub: string;
      detail: string;
      cta: string;
      onPress: () => void;
    }> = [];

    const hw = (q.data?.homeworks ?? []).find((h) => h.child_id === activeChildId && !h.done);
    if (hw) {
      cards.push({
        key: `hw-${hw.id}`,
        tone: colors.success,
        title: ch.hwCardTitle(activeChild.name),
        sub: `${hw.subject}${hw.title ? ` - ${hw.title}` : ""}`,
        detail: ch.dueTonight("21:00"),
        cta: ch.viewNow,
        onPress: () => router.push(`/con-cai/them?type=homework&id=${hw.id}&childId=${activeChildId}`),
      });
    }

    const today = new Date().getDay();
    const sched = (q.data?.schedules ?? []).find((x) => x.child_id === activeChildId && x.day_of_week === today);
    if (sched) {
      cards.push({
        key: `sch-${sched.id}`,
        tone: colors.pink,
        title: ch.scheduleCard,
        sub: sched.subject,
        detail: `${sched.time_start?.slice(0, 5) ?? "—"} - ${sched.time_end?.slice(0, 5) ?? "—"}`,
        cta: ch.remindChild,
        onPress: () => router.push(`/con-cai/them?type=schedule&id=${sched.id}&childId=${activeChildId}`),
      });
    }

    cards.push({
      key: "weekly",
      tone: colors.warning,
      title: ch.weeklyGoal,
      sub: ch.readingGoal,
      detail: "4/7",
      cta: ch.encourage,
      onPress: () => router.push(`/con-cai/them?type=achievement&childId=${activeChildId}`),
    });

    const reminder = (q.data?.reminders ?? []).find((r) => !r.done && (!r.child_id || r.child_id === activeChildId));
    if (reminder) {
      cards.push({
        key: `rm-${reminder.id}`,
        tone: colors.brand,
        title: ch.waterReminder,
        sub: ch.waterHint(activeChild.name),
        detail: reminder.title,
        cta: ch.remindChild,
        onPress: () => router.push(`/con-cai/them?type=reminder&id=${reminder.id}`),
      });
    }

    return cards.slice(0, 4);
  }, [activeChild, activeChildId, ch, colors, q.data, router]);

  const albums = (albumsQ.data?.albums ?? []).slice(0, 6);

  const tools = [
    { label: ch.toolLearn, emoji: "📚", href: `/con-cai/bai-tap?childId=${activeChildId ?? ""}` as const },
    { label: ch.toolNutrition, emoji: "🥗", href: { pathname: "/coming-soon", params: { feature: "dinh-duong-con" } } },
    { label: ch.toolGrowth, emoji: "📏", href: { pathname: "/coming-soon", params: { feature: "tang-truong" } } },
    { label: ch.toolEmotion, emoji: "💛", href: { pathname: "/coming-soon", params: { feature: "cam-xuc-con" } } },
    { label: ch.toolAchieve, emoji: "🏆", href: `/con-cai/thanh-tich?childId=${activeChildId ?? ""}` as const },
    { label: ch.toolLibrary, emoji: "📖", href: { pathname: "/coming-soon", params: { feature: "thu-vien-tai-lieu" } } },
  ];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerIcon}>
          <ArrowLeft color={colors.foreground} size={22} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>{ch.title}</Text>
          <View style={styles.subtitleRow}>
            <Heart size={12} color={colors.brand} fill={colors.brand} />
            <Text style={styles.subtitle} numberOfLines={1}>
              {ch.subtitle}
            </Text>
          </View>
        </View>
      </View>

      {(famLoading || q.isLoading) && <LoadingState />}
      {q.isError && <ErrorState message={(q.error as Error).message} />}
      {!famLoading && !familyId && <EmptyState title={c.noFamily} />}

      {q.data && familyId && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childStrip}>
            {q.data.children.map((child, i) => {
              const active = child.id === activeChildId;
              const age = childAge(child.dob);
              const accent = CHILD_ACCENTS[i % CHILD_ACCENTS.length];
              const avatar = childAvatarDisplay(child.avatar, child.name);
              return (
                <Pressable
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  onLongPress={() => router.push(`/con-cai/them?type=child&id=${child.id}`)}
                  style={[styles.childCard, active && { borderColor: colors.brand, borderWidth: 2 }]}
                >
                  <View style={[styles.childPhotoRing, { borderColor: accent }]}>
                    {avatar.kind === "uri" ? (
                      <Image source={{ uri: avatar.uri }} style={styles.childPhoto} />
                    ) : (
                      <View style={[styles.childPhoto, styles.childInitialBg]}>
                        <Text style={styles.childInitial}>{avatar.initial}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.childLabel, active && { color: colors.brand }]} numberOfLines={1}>
                    {child.name}
                    {age != null ? `, ${ch.yearsOld(age)}` : ""}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.addChild} onPress={() => router.push("/con-cai/them?type=child")}>
              <View style={styles.addCircle}>
                <Plus color={colors.muted} size={22} />
              </View>
              <Text style={styles.addLabel}>{ch.add}</Text>
            </Pressable>
          </ScrollView>

          {activeChildId ? (
            <Pressable
              style={styles.editProfileRow}
              onPress={() => router.push(`/con-cai/them?type=child&id=${activeChildId}`)}
            >
              <Pencil size={14} color={colors.brand} />
              <Text style={styles.editProfileText}>{ch.editProfile}</Text>
            </Pressable>
          ) : null}

          {q.data.children.length === 0 ? (
            <EmptyState title={ch.empty} description={ch.addChildHint} />
          ) : (
            <>
              <SectionHead title={ch.todayOverview} styles={styles} />
              <View style={styles.overviewCard}>
                <View style={styles.overviewLeft}>
                  <View style={styles.ringWrap}>
                    <ScoreRing score={metrics.overall} color={colors.brand} />
                    <View style={styles.ringCenter}>
                      <Text style={styles.scoreBig}>{metrics.overall.toFixed(1)}</Text>
                      <Text style={styles.scoreLabel}>{ch.devScore}</Text>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={10}
                            color={colors.warning}
                            fill={n <= Math.round(metrics.overall / 2) ? colors.warning : "transparent"}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusGood}>{ch.statusGood}</Text>
                  </View>
                  <Text style={styles.vsWeek}>{ch.vsLastWeek(0.8)}</Text>
                </View>
                <View style={styles.metricGrid}>
                  <MetricTile
                    icon={BookOpen}
                    label={ch.metricLearn}
                    value={metrics.learn}
                    hint={ch.learnDone}
                    tint={colors.tintBlue}
                    iconColor={colors.brand}
                    styles={styles}
                    onPress={() => router.push(`/con-cai/bai-tap?childId=${activeChildId ?? ""}`)}
                  />
                  <MetricTile
                    icon={Heart}
                    label={ch.metricEmotion}
                    value={metrics.emotion}
                    hint={ch.emotionHappy}
                    tint={colors.tintPurple}
                    iconColor={colors.pink}
                    styles={styles}
                  />
                  <MetricTile
                    icon={Activity}
                    label={ch.metricPhysical}
                    value={metrics.physical}
                    hint={ch.physicalGoal}
                    tint={colors.tintGreen}
                    iconColor={colors.success}
                    styles={styles}
                  />
                  <MetricTile
                    icon={Moon}
                    label={ch.metricSleep}
                    value={metrics.sleep}
                    hint={ch.sleepGood}
                    tint={colors.tintOrange}
                    iconColor={colors.warning}
                    styles={styles}
                  />
                </View>
              </View>

              <SectionHead
                title={ch.tasksTitle}
                action={c.seeAll}
                onAction={() => router.push(`/con-cai/bai-tap?childId=${activeChildId ?? ""}`)}
                styles={styles}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {taskCards.map((card) => (
                  <LinearGradient
                    key={card.key}
                    colors={[`${card.tone}33`, `${card.tone}14`]}
                    style={styles.taskCard}
                  >
                    <Text style={styles.taskTitle}>{card.title}</Text>
                    <Text style={styles.taskSub}>{card.sub}</Text>
                    <Text style={styles.taskDetail}>{card.detail}</Text>
                    <Pressable style={[styles.taskBtn, { backgroundColor: card.tone }]} onPress={card.onPress}>
                      <Text style={styles.taskBtnText}>{card.cta}</Text>
                    </Pressable>
                  </LinearGradient>
                ))}
              </ScrollView>

              <SectionHead
                title={ch.momentsTitle}
                action={c.seeAll}
                onAction={() => router.push(`/con-cai/khoanh-khac?childId=${activeChildId ?? ""}`)}
                styles={styles}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {albums.length === 0 ? (
                  <Pressable
                    style={styles.momentEmpty}
                    onPress={() => router.push(`/con-cai/khoanh-khac/tao?childId=${activeChildId ?? ""}`)}
                  >
                    <Plus color={colors.muted} size={28} />
                    <Text style={styles.muted}>{ch.createChildAlbum}</Text>
                  </Pressable>
                ) : (
                  albums.map((a) => (
                    <Pressable
                      key={a.id}
                      style={styles.momentCard}
                      onPress={() => router.push(`/con-cai/khoanh-khac/${a.id}?childId=${activeChildId}`)}
                    >
                      {a.cover_url ? (
                        <Image source={{ uri: resolveCover(a.cover_url) ?? a.cover_url }} style={styles.momentImg} />
                      ) : (
                        <View style={[styles.momentImg, styles.albumFallback]}>
                          <FolderOpen color={colors.muted} size={24} />
                        </View>
                      )}
                      <Text style={styles.momentTitle} numberOfLines={1}>
                        {a.title}
                      </Text>
                      <Text style={styles.momentDate}>{ch.albumPhotoCount(a.moment_count ?? 0)}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>

              <SectionHead title={ch.aiTitle(childName)} styles={styles} />
              <View style={styles.aiCard}>
                <View style={styles.aiIcon}>
                  <ExpoImage source={aiIcon} style={styles.aiIconImg} contentFit="contain" cachePolicy="memory-disk" />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  {[ch.aiTip1, ch.aiTip2, ch.aiTip3].map((tip) => (
                    <View key={tip} style={styles.aiRow}>
                      <Text style={styles.aiCheck}>✓</Text>
                      <Text style={styles.aiText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <SectionHead title={ch.toolsTitle} styles={styles} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
                {tools.map((tool) => (
                  <Pressable
                    key={tool.label}
                    style={styles.toolTile}
                    onPress={() => router.push(tool.href as never)}
                  >
                    <View style={styles.toolIcon}>
                      <Text style={{ fontSize: 22 }}>{tool.emoji}</Text>
                    </View>
                    <Text style={styles.toolLabel} numberOfLines={2}>
                      {tool.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ height: 32 }} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SectionHead({
  title,
  action,
  onAction,
  styles,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.link}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  tint,
  iconColor,
  styles,
  onPress,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  hint: string;
  tint: string;
  iconColor: string;
  styles: ReturnType<typeof useStyles>;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { backgroundColor: `${iconColor}22` }]}>
          <Icon size={14} color={iconColor} />
        </View>
        <Text style={styles.metricValue}>{value.toFixed(1)}/10</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHint} numberOfLines={1}>
        {hint}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.metricTile, { backgroundColor: tint }]} onPress={onPress}>
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.metricTile, { backgroundColor: tint }]}>{inner}</View>;
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    screen: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingBottom: 24 },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    headerTitle: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground },
    subtitleRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginTop: 2 },
    subtitle: { fontSize: 11 * fontScale, color: c.muted, flex: 1 },
    editProfileRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      alignSelf: "flex-end" as const,
      marginBottom: 8,
      paddingVertical: 4,
    },
    editProfileText: { color: c.brand, fontWeight: "700" as const, fontSize: 12 * fontScale },
    childStrip: { gap: 12, paddingVertical: 8, paddingRight: 8 },
    childCard: {
      width: 88,
      alignItems: "center" as const,
      padding: 8,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: "transparent",
    },
    childPhotoRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      padding: 2,
      position: "relative" as const,
    },
    childPhoto: { width: "100%" as const, height: "100%" as const, borderRadius: 30 },
    childInitialBg: { alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: c.tintBlue },
    childInitial: { fontSize: 22, fontWeight: "800" as const, color: c.brand },
    childLabel: { fontSize: 10 * fontScale, fontWeight: "600" as const, color: c.foreground, marginTop: 6, textAlign: "center" as const },
    addChild: { width: 72, alignItems: "center" as const },
    addCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1.5,
      borderStyle: "dashed" as const,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    addLabel: { fontSize: 10 * fontScale, color: c.muted, marginTop: 6, fontWeight: "600" as const },
    sectionHead: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginTop: 8,
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 16 * fontScale, fontWeight: "800" as const, color: c.foreground },
    link: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.brand },
    overviewCard: {
      flexDirection: "row" as const,
      gap: 12,
      backgroundColor: c.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      marginBottom: 8,
      ...cardShadow(c),
    },
    overviewLeft: { width: 118, alignItems: "center" as const },
    ringWrap: { width: 112, height: 112, alignItems: "center" as const, justifyContent: "center" as const },
    ringCenter: { position: "absolute" as const, alignItems: "center" as const },
    scoreBig: { fontSize: 22 * fontScale, fontWeight: "800" as const, color: c.foreground },
    scoreLabel: { fontSize: 9 * fontScale, color: c.muted, textAlign: "center" as const, marginTop: 2 },
    stars: { flexDirection: "row" as const, gap: 1, marginTop: 4 },
    statusPill: {
      marginTop: 8,
      backgroundColor: c.tintGreen,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    statusGood: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.success },
    vsWeek: { fontSize: 10 * fontScale, color: c.muted, marginTop: 4, textAlign: "center" as const },
    metricGrid: { flex: 1, flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    metricTile: { width: "47%" as const, borderRadius: radius.lg, padding: 10, minHeight: 78 },
    metricTop: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    metricIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center" as const, justifyContent: "center" as const },
    metricValue: { fontSize: 11 * fontScale, fontWeight: "800" as const, color: c.foreground },
    metricLabel: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.foreground, marginTop: 6 },
    metricHint: { fontSize: 9 * fontScale, color: c.muted, marginTop: 2 },
    hRow: { gap: 10, paddingBottom: 4 },
    taskCard: {
      width: 200,
      borderRadius: radius.xl,
      padding: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    taskTitle: { fontSize: 13 * fontScale, fontWeight: "800" as const, color: c.foreground },
    taskSub: { fontSize: 12 * fontScale, color: c.foreground, marginTop: 6 },
    taskDetail: { fontSize: 11 * fontScale, color: c.muted, marginTop: 4 },
    taskBtn: {
      marginTop: 12,
      alignSelf: "flex-start" as const,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
    },
    taskBtnText: { color: c.white, fontSize: 11 * fontScale, fontWeight: "700" as const },
    momentCard: { width: 140 },
    momentEmpty: {
      width: 140,
      height: 140,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
    },
    momentImg: { width: 140, height: 140, borderRadius: radius.lg },
    albumFallback: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.tintBlue,
    },
    momentTitle: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.foreground, marginTop: 6 },
    momentDate: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    aiCard: {
      flexDirection: "row" as const,
      gap: 12,
      backgroundColor: c.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      marginBottom: 8,
      ...cardShadow(c),
    },
    aiIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    aiIconImg: { width: 32, height: 32 },
    aiRow: { flexDirection: "row" as const, gap: 8, alignItems: "flex-start" as const },
    aiCheck: { color: c.success, fontWeight: "800" as const, fontSize: 12 },
    aiText: { flex: 1, fontSize: 12 * fontScale, color: c.foreground, lineHeight: 18 },
    toolsRow: { gap: 10, paddingBottom: 8 },
    toolTile: { width: 56, alignItems: "center" as const },
    toolIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      ...cardShadow(c),
    },
    toolLabel: {
      width: 72,
      fontSize: 10 * fontScale,
      color: c.foreground,
      textAlign: "center" as const,
      marginTop: 6,
      lineHeight: 13,
    },
    muted: { fontSize: 12 * fontScale, color: c.muted },
  }));
}
