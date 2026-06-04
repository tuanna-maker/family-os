import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

function useStateStyles() {
  return useThemedStyles((colors, fontScale) => ({
    wrap: { paddingVertical: 32, alignItems: "center" as const },
    empty: { paddingVertical: 24, alignItems: "center" as const, gap: 6 },
    emptyTitle: {
      fontSize: 16 * fontScale,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center" as const,
    },
    emptySub: {
      fontSize: 14 * fontScale,
      color: colors.muted,
      textAlign: "center" as const,
      lineHeight: 20,
    },
    action: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
    actionText: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: colors.brand },
  }));
}

export function LoadingState() {
  const { colors } = useTheme();
  const styles = useStateStyles();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = useStateStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptySub}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  const { colors } = useTheme();
  const styles = useStateStyles();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.emergency }]}>Lỗi</Text>
      <Text style={styles.emptySub}>{message}</Text>
    </View>
  );
}
