import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ClipboardList,
  FileHeart,
  Syringe,
  TestTube,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";

export type HealthRecordCounts = {
  tests: number;
  meds: number;
  appts: number;
  allergies: number;
  conditions: number;
};

const TILES: {
  icon: LucideIcon;
  label: string;
  href: string;
  countKey: keyof HealthRecordCounts;
  detail: (n: number) => string;
}[] = [
  { icon: TestTube, label: "Chỉ số", href: "/suc-khoe/chi-so", countKey: "tests", detail: (n) => `${n} bản ghi` },
  { icon: ClipboardList, label: "Đơn thuốc", href: "/suc-khoe/don-thuoc", countKey: "meds", detail: (n) => `${n} đang dùng` },
  { icon: Syringe, label: "Lịch khám", href: "/suc-khoe/lich-kham", countKey: "appts", detail: (n) => `${n} mục` },
  { icon: AlertTriangle, label: "Dị ứng", href: "/suc-khoe/di-ung", countKey: "allergies", detail: (n) => `${n} ghi nhận` },
  { icon: FileHeart, label: "Bệnh nền", href: "/suc-khoe/benh-nen", countKey: "conditions", detail: (n) => `${n} ghi nhận` },
];

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
  const styles = useTileStyles();
  return (
    <Pressable
      style={[styles.tile, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <Icon color={colors.pink} size={22} strokeWidth={2.2} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </Pressable>
  );
}

export function HealthRecordTiles({ counts }: { counts: HealthRecordCounts }) {
  const router = useRouter();
  const styles = useTileStyles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {TILES.map((t) => (
        <RecordTile
          key={t.label}
          icon={t.icon}
          label={t.label}
          detail={t.detail(counts[t.countKey])}
          onPress={() => router.push(t.href as never)}
        />
      ))}
    </ScrollView>
  );
}

function useTileStyles() {
  return useThemedStyles((c, fontScale) => ({
    scrollContent: {
      flexDirection: "row" as const,
      gap: 10,
      paddingBottom: 6,
      paddingRight: 4,
    },
    tile: {
      width: 96,
      minHeight: 108,
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      ...cardShadow(c),
    },
    label: {
      fontSize: 11 * fontScale,
      fontWeight: "700" as const,
      color: c.foreground,
      textAlign: "center" as const,
    },
    detail: {
      fontSize: 10 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
    },
  }));
}
