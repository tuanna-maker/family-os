import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Bookmark,
  Settings,
  Wallet,
  ShoppingBasket,
  HeartPulse,
  HeartHandshake,
  Plane,
  Home as HomeIcon,
  ShoppingCart,
  Crown,
  Car,
  QrCode,
  Wrench,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { SectionTitle } from "@mobile/components/ui";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import type { AppColors } from "@mobile/theme/palettes";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getDashboard } from "@mobile/api/dashboard";
import { listMoments } from "@mobile/api/moments";

const HERO =
  "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=240&h=240&fit=crop&crop=faces&q=70&auto=format";

function formatVnd(n: number) {
  return `${(n ?? 0).toLocaleString("vi-VN")}đ`;
}

function useGiaDinhStyles() {
  return useThemedStyles((colors, fontScale) => ({
    topBar: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    pageTitle: { fontSize: 22 * fontScale, fontWeight: "800" as const, color: colors.foreground },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 18,
      marginBottom: 24,
      ...cardShadow(colors),
    },
    heroRow: { flexDirection: "row" as const, gap: 14 },
    heroImg: { width: 96, height: 96, borderRadius: 48 },
    familyName: { fontSize: 20 * fontScale, fontWeight: "800" as const, color: colors.foreground },
    badge: {
      alignSelf: "flex-start" as const,
      backgroundColor: colors.tintBlue,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      marginTop: 6,
    },
    badgeText: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: colors.brand },
    tagline: { fontSize: 12 * fontScale, color: colors.muted, fontStyle: "italic" as const, marginTop: 8, lineHeight: 18 },
    heroActions: { flexDirection: "row" as const, gap: 8, marginTop: 20 },
    heroAction: { flex: 1, alignItems: "center" as const, gap: 6 },
    heroActionIcon: {
      width: "100%" as const,
      height: 52,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    heroActionLabel: { fontSize: 11 * fontScale, fontWeight: "600" as const, color: colors.foreground, textAlign: "center" as const },
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 12, marginBottom: 24 },
    gridCard: {
      width: "47%" as const,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      minHeight: 130,
      gap: 4,
      ...cardShadow(colors),
    },
    gridTitle: { fontSize: 13 * fontScale, fontWeight: "800" as const, color: colors.foreground },
    gridAmount: { fontSize: 20 * fontScale, fontWeight: "800" as const, color: colors.foreground, marginTop: 4 },
    gridSub: { fontSize: 11 * fontScale, color: colors.muted },
    bigNum: { fontSize: 28 * fontScale, fontWeight: "800" as const, color: colors.foreground },
    deltaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginTop: 2 },
    gridChev: { position: "absolute" as const, top: 12, right: 12 },
    serviceRow: { flexDirection: "row" as const, gap: 10, paddingBottom: 16 },
    serviceTile: { width: 72, alignItems: "center" as const, gap: 6 },
    serviceIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    serviceLabel: { fontSize: 11 * fontScale, fontWeight: "600" as const, color: colors.foreground, textAlign: "center" as const },
    momentsRow: { flexDirection: "row" as const, gap: 12 },
    moment: { width: 120 },
    momentImg: { width: 120, height: 120, borderRadius: radius.md },
    momentTitle: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: colors.foreground, marginTop: 6 },
  }));
}

export default function GiaDinhScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useGiaDinhStyles();
  const { familyId } = useFamilyContext();

  const dashQ = useQuery({
    queryKey: ["family-dashboard", familyId],
    queryFn: () => getDashboard({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const momentsQ = useQuery({
    queryKey: ["family-moments-preview", familyId],
    queryFn: () => listMoments({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const dash = dashQ.data;
  const expCur = dash?.expenses_month.total ?? 0;
  const expPrev = dash?.expenses_prev_month.total ?? 0;
  const expDelta = expPrev > 0 ? ((expCur - expPrev) / expPrev) * 100 : 0;
  const expDown = expDelta <= 0;
  const memberCount = dash?.member_count ?? 0;
  const foodCount = (dash?.food.expiring_soon ?? 0) + (dash?.food.expired ?? 0);

  return (
    <Screen contentStyle={{ paddingTop: 8 }}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.push("/(tabs)/home")}>
          <ChevronLeft color={colors.foreground} size={24} />
        </Pressable>
        <Text style={styles.pageTitle}>Gia đình tôi</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <Image source={{ uri: HERO }} style={styles.heroImg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.familyName}>Gia đình Minh</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {memberCount > 0 ? `${memberCount} thành viên` : "Gia đình"}
              </Text>
            </View>
            <Text style={styles.tagline}>
              "Cùng nhau xây dựng tổ ấm an toàn – hạnh phúc – tiện nghi" 💙
            </Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <HeroAction styles={styles} colors={colors} icon={Users} label="Thành viên" onPress={() => router.push("/(tabs)/tai-khoan")} tint={colors.tintBlue} />
          <HeroAction styles={styles} colors={colors} icon={Calendar} label="Lịch gia đình" onPress={() => router.push("/lich-gia-dinh")} tint={colors.tintPurple} />
          <HeroAction styles={styles} colors={colors} icon={Bookmark} label="Kỷ niệm" onPress={() => router.push("/ky-niem-gia-dinh")} tint={colors.tintOrange} />
          <HeroAction styles={styles} colors={colors} icon={Settings} label="Cài đặt" onPress={() => router.push("/cai-dat/thong-bao")} tint={colors.tintGreen} />
        </View>
      </View>

      <SectionTitle>Quản lý gia đình</SectionTitle>
      <View style={styles.grid}>
        <Pressable style={[styles.gridCard, { backgroundColor: colors.tintBlue }]} onPress={() => router.push("/chi-tieu")}>
          <Wallet color={colors.white} size={18} />
          <Text style={styles.gridTitle}>Chi tiêu gia đình</Text>
          <Text style={styles.gridAmount}>{formatVnd(expCur)}</Text>
          {expPrev > 0 ? (
            <View style={styles.deltaRow}>
              {expDown ? <TrendingDown color={colors.success} size={12} /> : <TrendingUp color={colors.emergency} size={12} />}
              <Text style={{ color: expDown ? colors.success : colors.emergency, fontSize: 10 }}>
                {Math.abs(expDelta).toFixed(1)}% so với tháng trước
              </Text>
            </View>
          ) : null}
          <ChevronRight color={colors.muted} size={14} style={styles.gridChev} />
        </Pressable>

        <Pressable style={styles.gridCard} onPress={() => router.push("/con-cai")}>
          <Text style={{ fontSize: 20 }}>👧</Text>
          <Text style={styles.gridTitle}>Đồng hành cùng con</Text>
          {(dash?.children ?? []).slice(0, 2).map((c) => (
            <Text key={c.id} style={styles.gridSub} numberOfLines={1}>
              {c.name} · {c.today_count} lịch hôm nay
            </Text>
          ))}
          <ChevronRight color={colors.muted} size={14} style={styles.gridChev} />
        </Pressable>

        <Pressable style={[styles.gridCard, { backgroundColor: colors.tintOrange }]} onPress={() => router.push("/thuc-pham")}>
          <ShoppingBasket color={colors.white} size={18} />
          <Text style={styles.gridTitle}>Thực phẩm & Tủ lạnh</Text>
          <Text style={styles.bigNum}>{foodCount}</Text>
          <Text style={styles.gridSub}>sắp hết hạn</Text>
          <ChevronRight color={colors.muted} size={14} style={styles.gridChev} />
        </Pressable>

        <Pressable style={[styles.gridCard, { backgroundColor: colors.tintGreen }]} onPress={() => router.push("/suc-khoe")}>
          <HeartPulse color={colors.white} size={18} />
          <Text style={styles.gridTitle}>Sức khỏe gia đình</Text>
          <Text style={styles.gridSub} numberOfLines={2}>
            {dash?.next_medicine
              ? `${dash.next_medicine.member_name} uống ${dash.next_medicine.medicine}`
              : "Chưa có lịch thuốc"}
          </Text>
          <ChevronRight color={colors.muted} size={14} style={styles.gridChev} />
        </Pressable>

        <Pressable style={styles.gridCard} onPress={() => router.push("/cham-soc-ong-ba")}>
          <HeartHandshake color={colors.brand} size={18} />
          <Text style={styles.gridTitle}>Chăm sóc ông bà</Text>
          <Text style={styles.gridSub}>Safe Check · nhắc thuốc</Text>
          <ChevronRight color={colors.muted} size={14} style={styles.gridChev} />
        </Pressable>
      </View>

      <SectionTitle>Dịch vụ gia đình</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={styles.serviceRow}>
          <ServiceTile styles={styles} colors={colors} icon={Plane} label="Cả nhà du lịch" onPress={() => router.push("/du-lich")} />
          <ServiceTile styles={styles} colors={colors} icon={HomeIcon} label="Dịch vụ tại nhà" onPress={() => router.push("/quan-ly-giup-viec")} />
          <ServiceTile styles={styles} colors={colors} icon={ShoppingCart} label="Mua sắm hộ" onPress={() => router.push("/mua-sam-ho")} />
          <ServiceTile styles={styles} colors={colors} icon={QrCode} label="QR khách" onPress={() => router.push("/qr-vao-ra")} />
          <ServiceTile styles={styles} colors={colors} icon={Car} label="Đặt xe" onPress={() => router.push("/dat-xe")} />
          <ServiceTile styles={styles} colors={colors} icon={Wrench} label="Dịch vụ BQL" onPress={() => router.push("/dich-vu")} />
          <ServiceTile styles={styles} colors={colors} icon={Crown} label="Gói ưu đãi" onPress={() => router.push("/goi-uu-dai")} />
        </View>
      </ScrollView>

      <SectionTitle>Khoảnh khắc gia đình</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
        <View style={styles.momentsRow}>
          {(momentsQ.data?.moments ?? []).slice(0, 5).map((m) => (
            <Pressable key={m.id} style={styles.moment} onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}>
              <Image source={{ uri: m.media_url }} style={styles.momentImg} />
              <Text style={styles.momentTitle} numberOfLines={1}>
                {(m.caption ?? "Kỷ niệm").replace(/^\[Pilot\]\s*/, "")}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

type GiaDinhStyles = ReturnType<typeof useGiaDinhStyles>;

function HeroAction({
  styles,
  colors,
  icon: Icon,
  label,
  onPress,
  tint,
}: {
  styles: GiaDinhStyles;
  colors: AppColors;
  icon: typeof Users;
  label: string;
  onPress: () => void;
  tint: string;
}) {
  return (
    <Pressable style={styles.heroAction} onPress={onPress}>
      <View style={[styles.heroActionIcon, { backgroundColor: tint }]}>
        <Icon color={colors.brand} size={22} />
      </View>
      <Text style={styles.heroActionLabel}>{label}</Text>
    </Pressable>
  );
}

function ServiceTile({
  styles,
  colors,
  icon: Icon,
  label,
  onPress,
}: {
  styles: GiaDinhStyles;
  colors: AppColors;
  icon: typeof Plane;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.serviceTile} onPress={onPress}>
      <View style={styles.serviceIcon}>
        <Icon color={colors.brand} size={26} />
      </View>
      <Text style={styles.serviceLabel}>{label}</Text>
    </Pressable>
  );
}
