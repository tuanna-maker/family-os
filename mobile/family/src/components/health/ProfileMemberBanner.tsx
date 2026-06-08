import { Text, View } from "react-native";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useI18n } from "@mobile/i18n/useI18n";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";

export function ProfileMemberBanner({ name }: { name: string }) {
  const { s } = useI18n();
  const styles = useBannerStyles();
  return (
    <View style={styles.banner}>
      <View style={styles.avatar}>
        <Text style={styles.emoji}>{avatarFor(name)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label}>{s.members.title}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function useBannerStyles() {
  return useThemedStyles((c, fontScale) => ({
    banner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      padding: 16,
      borderRadius: radius.xl,
      backgroundColor: c.tintBlue,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 16,
      ...cardShadow(c),
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    emoji: { fontSize: 30 },
    label: {
      fontSize: 11 * fontScale,
      fontWeight: "600" as const,
      color: c.muted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    name: {
      fontSize: 22 * fontScale,
      fontWeight: "800" as const,
      color: c.foreground,
      marginTop: 2,
      letterSpacing: -0.3,
    },
  }));
}
