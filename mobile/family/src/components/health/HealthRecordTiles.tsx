import { useMemo } from "react";
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
import { useI18n } from "@mobile/i18n/useI18n";
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
  const { s } = useI18n();
  const h = s.screens.health;
  const ov = h.overview;
  const styles = useTileStyles();

  const tiles = useMemo(
    () => [
      {
        icon: TestTube,
        label: h.subpage.vitalsTitle,
        href: "/suc-khoe/chi-so",
        detail: ov.tileVitalsDetail(counts.tests),
      },
      {
        icon: ClipboardList,
        label: h.prescription,
        href: "/suc-khoe/don-thuoc",
        detail: ov.tileMedsDetail(counts.meds),
      },
      {
        icon: Syringe,
        label: h.appointment,
        href: "/suc-khoe/lich-kham",
        detail: ov.tileApptsDetail(counts.appts),
      },
      {
        icon: AlertTriangle,
        label: h.allergy,
        href: "/suc-khoe/di-ung",
        detail: ov.tileRecorded(counts.allergies),
      },
      {
        icon: FileHeart,
        label: h.chronic,
        href: "/suc-khoe/benh-nen",
        detail: ov.tileRecorded(counts.conditions),
      },
    ],
    [counts, h, ov],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {tiles.map((t) => (
        <RecordTile
          key={t.href}
          icon={t.icon}
          label={t.label}
          detail={t.detail}
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
