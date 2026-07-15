import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, Camera, PieChart, Plus, Share2, Wallet } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

type Props = {
  labels: {
    add: string;
    report: string;
    scan: string;
    budget: string;
    share: string;
  };
  onAdd: () => void;
  onReport: () => void;
  onScan: () => void;
  onBudget: () => void;
  onShare: () => void;
};

export function ExpenseBottomBar({ labels, onAdd, onReport, onScan, onBudget, onShare }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useBarStyles();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <BarAction icon={<Plus size={20} color={colors.foreground} />} label={labels.add} onPress={onAdd} />
      <BarAction icon={<BarChart3 size={20} color={colors.foreground} />} label={labels.report} onPress={onReport} />
      <Pressable onPress={onScan} style={styles.scanWrap} accessibilityRole="button">
        <LinearGradient
          colors={[colors.brand, "#2563EB"]}
          style={styles.scanBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Camera size={26} color={colors.white} />
        </LinearGradient>
        <Text style={styles.scanLabel}>{labels.scan}</Text>
      </Pressable>
      <BarAction icon={<PieChart size={20} color={colors.foreground} />} label={labels.budget} onPress={onBudget} />
      <BarAction icon={<Share2 size={20} color={colors.foreground} />} label={labels.share} onPress={onShare} />
    </View>
  );
}

function BarAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const styles = useBarStyles();
  return (
    <Pressable style={styles.item} onPress={onPress} accessibilityRole="button">
      {icon}
      <Text style={styles.itemLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function useBarStyles() {
  return useThemedStyles((c, fontScale) => ({
    bar: {
      position: "absolute" as const,
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      justifyContent: "space-around" as const,
      paddingTop: 10,
      paddingHorizontal: 8,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    item: { flex: 1, alignItems: "center" as const, gap: 4, paddingBottom: 4 },
    itemLabel: { fontSize: 9 * fontScale, color: c.muted, fontWeight: "600" as const, textAlign: "center" as const },
    scanWrap: { flex: 1, alignItems: "center" as const, marginTop: -22 },
    scanBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    scanLabel: {
      fontSize: 9 * fontScale,
      color: c.brand,
      fontWeight: "700" as const,
      marginTop: 6,
      textAlign: "center" as const,
    },
  }));
}
