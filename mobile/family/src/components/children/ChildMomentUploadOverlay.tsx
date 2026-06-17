import { ActivityIndicator, Modal, Text, View } from "react-native";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import type { ChildMomentUploadProgress } from "@mobile/hooks/usePickChildMomentPhoto";

type Props = {
  visible: boolean;
  progress: ChildMomentUploadProgress | null;
};

export function ChildMomentUploadOverlay({ visible, progress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { s } = useI18n();
  const ch = s.screens.children;

  if (!visible) return null;

  const label =
    progress && progress.total > 1
      ? ch.momentsUploadingProgress
          .replace("{current}", String(progress.current))
          .replace("{total}", String(progress.total))
      : ch.momentsUploading;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
    },
    card: {
      width: "100%" as const,
      maxWidth: 280,
      backgroundColor: c.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: "center" as const,
      gap: 14,
    },
    label: {
      fontSize: 15 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      textAlign: "center" as const,
    },
  }));
}
