import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronRight,
  Users,
  Calendar,
  Bookmark,
  Settings,
  Wallet,
  ShoppingBasket,
  HeartPulse,
  HeartHandshake,
  Pill,
  Stethoscope,
  Plane,
  Home as HomeIcon,
  ShoppingCart,
  Crown,
  Car,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import type { AppColors } from "@mobile/theme/palettes";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getDashboard } from "@mobile/api/dashboard";
import { listMoments } from "@mobile/api/moments";
import { momentThumbUrl } from "@mobile/utils/momentMedia";
import { listFamilyMembers } from "@mobile/api/family-members";
import { AvatarUploadButton } from "@mobile/components/AvatarUploadButton";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatApptTime, formatCurrency, formatDate, formatExpenseMonthLabel } from "@mobile/i18n/format";
import { useAuth } from "@mobile/hooks/useAuth";
import { uploadAvatarFromUri, updateFamilyAvatar } from "@mobile/api/avatars";
import { resolveHouseholdAvatarUrl } from "@mobile/lib/household-avatar";
import { toast } from "@mobile/utils/toast";

const FOOD_THUMBS = [
  "https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=80&h=80&fit=crop&q=70&auto=format",
  "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop&q=70&auto=format",
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=80&h=80&fit=crop&q=70&auto=format",
];

const FALLBACK_MOMENTS = [
  {
    id: "1",
    title: "Đà Nẵng – Hội An",
    date: "20/05/2024",
    img: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=280&h=280&fit=crop&q=70&auto=format",
  },
];

function formatVnd(n: number, locale: "vi" | "en") {
  return formatCurrency(n, locale);
}

function useGiaDinhStyles() {
  return useThemedStyles((c, fontScale) => ({
    heroCard: {
      backgroundColor: c.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 18,
      marginBottom: 20,
      ...cardShadow(c),
    },
    heroRow: { flexDirection: "row" as const, gap: 14, alignItems: "flex-start" as const },
    heroImgWrap: { position: "relative" as const },
    heroImg: { width: 100, height: 100, borderRadius: 50 },
    heroImgFallback: {
      backgroundColor: c.tintPurple,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    heroImgInitial: { fontSize: 36 * fontScale, fontWeight: "800" as const, color: c.foreground },
    camBtn: {
      position: "absolute" as const,
      bottom: 2,
      right: 2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.brand,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 3,
      borderColor: c.card,
    },
    familyName: { fontSize: 22 * fontScale, fontWeight: "800" as const, color: c.foreground },
    badge: {
      alignSelf: "flex-start" as const,
      backgroundColor: c.tintBlue,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      marginTop: 6,
    },
    badgeText: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.brand },
    tagline: {
      fontSize: 13 * fontScale,
      color: c.muted,
      fontStyle: "italic" as const,
      marginTop: 8,
      lineHeight: 19,
    },
    heroActions: { flexDirection: "row" as const, gap: 10, marginTop: 18 },
    heroAction: { flex: 1, alignItems: "center" as const, gap: 6 },
    heroActionIcon: {
      width: "100%" as const,
      height: 50,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    heroActionLabel: { fontSize: 12 * fontScale, fontWeight: "500" as const, color: c.foreground, textAlign: "center" as const },
    sectionTitle: {
      fontSize: 17 * fontScale,
      fontWeight: "800" as const,
      color: c.foreground,
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
      rowGap: 10,
      marginBottom: 20,
    },
    gridCard: {
      width: "48%" as const,
      borderRadius: 22,
      padding: 14,
      minHeight: 128,
      position: "relative" as const,
    },
    gridCardBordered: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      ...cardShadow(c),
    },
    gridHead: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, paddingRight: 28 },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    gridTitle: { flex: 1, fontSize: 13 * fontScale, fontWeight: "800" as const, color: c.foreground, lineHeight: 17 },
    gridMonth: { fontSize: 10 * fontScale, color: c.muted, marginTop: 4 },
    gridAmount: { fontSize: 20 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 10 },
    bigNum: { fontSize: 30 * fontScale, fontWeight: "800" as const, color: c.foreground, lineHeight: 32 },
    deltaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginTop: 4 },
    deltaText: { fontSize: 10 * fontScale, fontWeight: "500" as const },
    chevCircle: {
      position: "absolute" as const,
      top: 12,
      right: 12,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      opacity: 0.85,
    },
    childList: { marginTop: 10, gap: 8 },
    childRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    childEmoji: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    childEmojiText: { fontSize: 15 },
    childName: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.foreground },
    childDetail: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    foodBottom: { flexDirection: "row" as const, alignItems: "flex-end" as const, marginTop: 10, gap: 6 },
    foodThumbs: { flexDirection: "row" as const, gap: 4, marginLeft: "auto" as const },
    foodThumb: { width: 28, height: 28, borderRadius: radius.sm },
    healthList: { marginTop: 10, gap: 10 },
    healthRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    healthIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const },
    healthTitle: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.foreground },
    healthDetail: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    servicesRow: { flexDirection: "row" as const, gap: 8, marginBottom: 20 },
    serviceTile: { flex: 1, alignItems: "center" as const, gap: 6 },
    serviceIcon: {
      width: "100%" as const,
      height: 56,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    serviceLabel: { fontSize: 11 * fontScale, fontWeight: "500" as const, color: c.foreground, textAlign: "center" as const, lineHeight: 14 },
    momentsHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 },
    link: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.brand },
    momentsRow: { flexDirection: "row" as const, gap: 10, paddingBottom: 24 },
    moment: { width: 120 },
    momentImg: { width: 120, height: 120, borderRadius: radius.md },
    momentTitle: { fontSize: 13 * fontScale, fontWeight: "700" as const, color: c.foreground, marginTop: 6 },
    momentDate: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
  }));
}

export default function GiaDinhScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const f = s.family;
  const c = s.common;
  const t = s.time;
  const styles = useGiaDinhStyles();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { familyId, family, profile } = useFamilyContext();
  const familyName = family?.name ?? c.defaultFamilyName;
  const isOwner = !!user?.id && family?.owner_id === user.id;
  const goMembers = () => router.push("/gia-dinh/thanh-vien" as import("expo-router").Href);

  const dashQ = useQuery({
    queryKey: ["family-dashboard", familyId],
    queryFn: () => getDashboard({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const momentsQ = useQuery({
    queryKey: ["family-moments-preview", familyId],
    queryFn: () => listMoments({ family_id: familyId!, lite: true }),
    enabled: !!familyId,
    staleTime: 60_000,
  });

  const membersQ = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listFamilyMembers({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  const dash = dashQ.data;
  const expCur = dash?.expenses_month.total ?? 0;
  const expPrev = dash?.expenses_prev_month.total ?? 0;
  const expDelta = expPrev > 0 ? ((expCur - expPrev) / expPrev) * 100 : 0;
  const expDown = expDelta <= 0;
  const members = membersQ.data?.members ?? [];
  const memberCount = members.length;
  const heroMember =
    members.find((m) => m.is_owner) ?? members[0] ?? null;
  const heroAvatar = resolveHouseholdAvatarUrl({
    profile,
    family,
    memberAvatar: heroMember?.avatar_url,
    isOwner,
  });

  const onFamilyAvatarPick = async (uri: string) => {
    if (!familyId) throw new Error(c.noFamilyYet);
    if (!isOwner) throw new Error(c.ownerOnly);
    const url = await uploadAvatarFromUri(uri, `family-${familyId}`);
    await updateFamilyAvatar({ family_id: familyId, avatar_url: url });
    toast.success(c.familyAvatarUpdated);
    qc.invalidateQueries({ queryKey: ["my-context"] });
  };
  const foodCount = (dash?.food.expiring_soon ?? 0) + (dash?.food.expired ?? 0);
  const nextMed = dash?.next_medicine;
  const nextAppt = dash?.next_appointment;

  const previewMoments =
    (momentsQ.data?.moments ?? []).length > 0
      ? (momentsQ.data?.moments ?? []).slice(0, 5).map((m) => ({
          id: m.id,
          title: (m.caption ?? c.memory).replace(/^\[Pilot\]\s*/, ""),
          date: formatDate(m.taken_at, locale),
          img: momentThumbUrl(m.media_url, m.thumbnail_url, 320),
        }))
      : FALLBACK_MOMENTS;

  return (
    <Screen contentStyle={{ paddingTop: Math.max(insets.top + 8, 16) }}>
      <View style={styles.heroCard}>
        <Pressable style={styles.chevCircle} onPress={() => router.push("/(tabs)/tai-khoan")}>
          <ChevronRight color={colors.muted} size={14} />
        </Pressable>
        <View style={styles.heroRow}>
          <View style={styles.heroImgWrap}>
            {isOwner ? (
              <AvatarUploadButton
                uri={heroAvatar}
                fallbackInitial={familyName}
                size={100}
                hint=""
                onPick={onFamilyAvatarPick}
              />
            ) : heroAvatar ? (
              <Image source={{ uri: heroAvatar }} style={styles.heroImg} />
            ) : (
              <View style={[styles.heroImg, styles.heroImgFallback]}>
                <Text style={styles.heroImgInitial}>{familyName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
            <Text style={styles.familyName} numberOfLines={1}>
              {familyName}
            </Text>
            <Pressable style={styles.badge} onPress={goMembers}>
              <Text style={styles.badgeText}>{s.family.memberBadge(memberCount)}</Text>
            </Pressable>
            <Text style={styles.tagline}>{c.tagline}</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <HeroAction
            styles={styles}
            icon={Users}
            label={s.family.membersAction}
            tint={colors.tintBlue}
            iconColor={colors.brand}
            onPress={goMembers}
          />
          <HeroAction
            styles={styles}
            icon={Calendar}
            label={s.family.calendar}
            tint={colors.tintPurple}
            iconColor={colors.pink}
            onPress={() => router.push("/lich-gia-dinh")}
          />
          <HeroAction
            styles={styles}
            icon={Bookmark}
            label={s.family.memories}
            tint={colors.tintOrange}
            iconColor={colors.warning}
            onPress={() => router.push("/ky-niem-gia-dinh")}
          />
          <HeroAction
            styles={styles}
            icon={Settings}
            label={s.family.settings}
            tint={colors.tintGreen}
            iconColor={colors.success}
            onPress={() => router.push("/cai-dat/thong-bao")}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{s.family.manage}</Text>
      <View style={styles.grid}>
        <Pressable
          style={[styles.gridCard, { backgroundColor: colors.tintBlue }]}
          onPress={() => router.push("/chi-tieu")}
        >
          <GridChevron styles={styles} colors={colors} />
          <View style={styles.gridHead}>
            <View style={[styles.iconBox, { backgroundColor: colors.brand }]}>
              <Wallet color={colors.white} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gridTitle}>{f.expense}</Text>
              <Text style={styles.gridMonth}>{c.totalExpenseInMonth(formatExpenseMonthLabel(locale))}</Text>
            </View>
          </View>
          <Text style={styles.gridAmount}>{formatVnd(expCur, locale)}</Text>
          {expPrev > 0 ? (
            <View style={styles.deltaRow}>
              {expDown ? (
                <TrendingDown color={colors.success} size={12} />
              ) : (
                <TrendingUp color={colors.emergency} size={12} />
              )}
              <Text style={[styles.deltaText, { color: expDown ? colors.success : colors.emergency }]}>
                {c.comparedToLastMonth(Math.abs(expDelta).toFixed(1).replace(".", ","))}
              </Text>
            </View>
          ) : (
            <Text style={[styles.deltaText, { color: colors.muted }]}>{c.noPrevMonthData}</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.gridCard, styles.gridCardBordered]}
          onPress={() => router.push("/con-cai")}
        >
          <GridChevron styles={styles} colors={colors} />
          <View style={styles.gridHead}>
            <View style={[styles.iconBox, { backgroundColor: colors.tintPurple }]}>
              <Text style={{ fontSize: 20 }}>👧</Text>
            </View>
            <Text style={[styles.gridTitle, { paddingTop: 4 }]}>{f.children}</Text>
          </View>
          <View style={[styles.childList, { marginTop: 10 }]}>
            {(dash?.children ?? []).slice(0, 2).map((ch) => (
              <Text key={ch.id} style={styles.childDetail} numberOfLines={1}>
                {c.childScheduleToday(ch.name, ch.today_count)}
              </Text>
            ))}
            {(dash?.children ?? []).length === 0 && (
              <Text style={styles.childDetail}>{c.noChildren}</Text>
            )}
          </View>
        </Pressable>

        <Pressable
          style={[styles.gridCard, { backgroundColor: colors.tintOrange }]}
          onPress={() => router.push("/thuc-pham")}
        >
          <GridChevron styles={styles} colors={colors} />
          <View style={styles.gridHead}>
            <View style={[styles.iconBox, { backgroundColor: colors.warning }]}>
              <ShoppingBasket color={colors.white} size={18} />
            </View>
            <Text style={[styles.gridTitle, { paddingTop: 4 }]}>{f.food}</Text>
          </View>
          <View style={styles.foodBottom}>
            <View>
              <Text style={styles.bigNum}>{foodCount}</Text>
              <Text style={styles.childDetail}>
                {dash && dash.food.expired > 0
                  ? `${c.foodExpired(dash.food.expired)}\n${c.foodExpiring.split("\n")[1] ?? ""}`
                  : c.foodExpiring}
              </Text>
            </View>
            <View style={styles.foodThumbs}>
              {FOOD_THUMBS.slice(0, Math.min(3, Math.max(foodCount, 1))).map((src, i) => (
                <Image key={i} source={{ uri: src }} style={styles.foodThumb} />
              ))}
            </View>
          </View>
        </Pressable>

        <Pressable
          style={[styles.gridCard, { backgroundColor: colors.tintGreen }]}
          onPress={() => router.push("/suc-khoe")}
        >
          <GridChevron styles={styles} colors={colors} />
          <View style={styles.gridHead}>
            <View style={[styles.iconBox, { backgroundColor: colors.success }]}>
              <HeartPulse color={colors.white} size={18} />
            </View>
            <Text style={[styles.gridTitle, { paddingTop: 4 }]}>{f.health}</Text>
          </View>
          <View style={styles.healthList}>
            {nextMed ? (
              <HealthRow
                styles={styles}
                icon={Pill}
                iconColor={colors.emergency}
                tint={colors.tintRed}
                title={f.medicineToday(nextMed.member_name, nextMed.medicine)}
                detail={
                  nextMed.time_of_day
                    ? t.todayAt(String(nextMed.time_of_day).slice(0, 5))
                    : t.today
                }
              />
            ) : (
              <HealthRow
                styles={styles}
                icon={Pill}
                iconColor={colors.emergency}
                tint={colors.tintRed}
                title={f.noMedicineSchedule}
                detail={f.addMedicineHint}
              />
            )}
            {nextAppt ? (
              <HealthRow
                styles={styles}
                icon={Stethoscope}
                iconColor={colors.pink}
                tint={colors.tintPurple}
                title={f.apptSoon(nextAppt.member_name)}
                detail={formatApptTime(nextAppt.scheduled_at, locale)}
              />
            ) : (
              <HealthRow
                styles={styles}
                icon={Stethoscope}
                iconColor={colors.pink}
                tint={colors.tintPurple}
                title={f.noApptSoon}
                detail={f.bookApptHint}
              />
            )}
          </View>
        </Pressable>

        <Pressable
          style={[styles.gridCard, { backgroundColor: colors.tintBlue }]}
          onPress={() => router.push("/cham-soc-ong-ba")}
        >
          <GridChevron styles={styles} colors={colors} />
          <View style={styles.gridHead}>
            <View style={[styles.iconBox, { backgroundColor: colors.brand }]}>
              <HeartHandshake color={colors.white} size={18} />
            </View>
            <Text style={[styles.gridTitle, { paddingTop: 4 }]}>{f.elderlyCare}</Text>
          </View>
          <Text style={[styles.childDetail, { marginTop: 10 }]}>{c.safeCheckNote}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{f.familyServices}</Text>
      <View style={styles.servicesRow}>
        <ServiceTile
          styles={styles}
          icon={Plane}
          label={f.travel}
          tint={colors.tintBlue}
          iconColor={colors.brand}
          onPress={() => router.push("/du-lich")}
        />
        <ServiceTile
          styles={styles}
          icon={HomeIcon}
          label={f.homeService}
          tint={colors.tintGreen}
          iconColor={colors.success}
          onPress={() => router.push("/quan-ly-giup-viec")}
        />
        <ServiceTile
          styles={styles}
          icon={Car}
          label={f.bookCar}
          tint={colors.tintOrange}
          iconColor={colors.warning}
          onPress={() => router.push({ pathname: "/coming-soon", params: { feature: "dat-xe-gia-dinh" } })}
        />
        <ServiceTile
          styles={styles}
          icon={ShoppingCart}
          label={f.shopForMe}
          tint={colors.tintPurple}
          iconColor={colors.pink}
          onPress={() => router.push({ pathname: "/coming-soon", params: { feature: "mua-sam-ho" } })}
        />
        <ServiceTile
          styles={styles}
          icon={Crown}
          label={f.promoPackages}
          tint={colors.tintOrange}
          iconColor={colors.warning}
          onPress={() => router.push({ pathname: "/coming-soon", params: { feature: "goi-uu-dai" } })}
        />
      </View>

      <View style={styles.momentsHeader}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{f.moments}</Text>
        <Pressable onPress={() => router.push("/ky-niem-gia-dinh")}>
          <Text style={styles.link}>{c.seeAll}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.momentsRow}>
          {previewMoments.map((m) => (
            <Pressable key={m.id} style={styles.moment} onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}>
              <Image source={{ uri: m.img }} style={styles.momentImg} />
              <Text style={styles.momentTitle} numberOfLines={1}>
                {m.title}
              </Text>
              <Text style={styles.momentDate}>{m.date}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

    </Screen>
  );
}

type GiaDinhStyles = ReturnType<typeof useGiaDinhStyles>;

function HealthRow({
  styles,
  icon: Icon,
  iconColor,
  tint,
  title,
  detail,
}: {
  styles: GiaDinhStyles;
  icon: LucideIcon;
  iconColor: string;
  tint: string;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.healthRow}>
      <View style={[styles.healthIcon, { backgroundColor: tint }]}>
        <Icon color={iconColor} size={14} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.healthTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.healthDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function GridChevron({ styles, colors }: { styles: GiaDinhStyles; colors: AppColors }) {
  return (
    <View style={styles.chevCircle}>
      <ChevronRight color={colors.muted} size={12} />
    </View>
  );
}

function HeroAction({
  styles,
  icon: Icon,
  label,
  onPress,
  tint,
  iconColor,
}: {
  styles: GiaDinhStyles;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tint: string;
  iconColor: string;
}) {
  return (
    <Pressable style={styles.heroAction} onPress={onPress}>
      <View style={[styles.heroActionIcon, { backgroundColor: tint }]}>
        <Icon color={iconColor} size={22} strokeWidth={2.4} />
      </View>
      <Text style={styles.heroActionLabel}>{label}</Text>
    </Pressable>
  );
}

function ServiceTile({
  styles,
  icon: Icon,
  label,
  onPress,
  tint,
  iconColor,
}: {
  styles: GiaDinhStyles;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tint: string;
  iconColor: string;
}) {
  return (
    <Pressable style={styles.serviceTile} onPress={onPress}>
      <View style={[styles.serviceIcon, { backgroundColor: tint }]}>
        <Icon color={iconColor} size={26} strokeWidth={2.4} />
      </View>
      <Text style={styles.serviceLabel}>{label}</Text>
    </Pressable>
  );
}
