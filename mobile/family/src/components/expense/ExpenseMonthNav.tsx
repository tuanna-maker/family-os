import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { monthRangeLabel } from "@mobile/lib/expense-settings";

export function ExpenseMonthNav({
  year,
  month,
  locale,
  onPrev,
  onNext,
  onPressLabel,
}: {
  year: number;
  month: number;
  locale: "vi" | "en";
  onPrev: () => void;
  onNext: () => void;
  onPressLabel?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useNavStyles();
  const label = monthRangeLabel(year, month, locale);

  return (
    <View style={styles.bar}>
      <Pressable onPress={onPrev} hitSlop={10} style={styles.arrow}>
        <ChevronLeft size={20} color={colors.foreground} />
      </Pressable>
      <Pressable onPress={onPressLabel} disabled={!onPressLabel} style={styles.center}>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      <Pressable onPress={onNext} hitSlop={10} style={styles.arrow}>
        <ChevronRight size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

function useNavStyles() {
  return useThemedStyles((c, fontScale) => ({
    bar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    arrow: { padding: 4 },
    center: { flex: 1, alignItems: "center" as const },
    label: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.foreground },
  }));
}
