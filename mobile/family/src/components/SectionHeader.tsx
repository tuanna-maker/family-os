import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

function useSectionStyles() {
  return useThemedStyles((colors, fontScale) => ({
    row: { flexDirection: "row" as const, alignItems: "center" as const, marginBottom: 12, gap: 8 },
    title: { fontSize: 17 * fontScale, fontWeight: "700" as const, color: colors.foreground },
    sub: { fontSize: 12 * fontScale, color: colors.muted, marginTop: 2 },
    addBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      backgroundColor: colors.brandDeep,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    addText: { color: colors.white, fontSize: 12 * fontScale, fontWeight: "700" as const },
  }));
}

export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = useSectionStyles();

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {action}
      {onAction && (
        <Pressable onPress={onAction} style={styles.addBtn}>
          <Plus color={colors.white} size={14} />
          <Text style={styles.addText}>{actionLabel ?? "Thêm"}</Text>
        </Pressable>
      )}
    </View>
  );
}
