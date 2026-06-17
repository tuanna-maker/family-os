import { ImageBackground, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FolderOpen } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import type { ChildAlbum } from "@mobile/api/child-albums";

type Props = {
  album: ChildAlbum;
  width: number;
  height: number;
  elevated?: boolean;
};

export function ChildAlbumGridCard({ album, width, height, elevated }: Props) {
  const { colors } = useTheme();
  const styles = useCardStyles();

  const shell = [
    styles.card,
    { width, height },
    elevated && styles.cardElevated,
  ];

  if (album.cover_url) {
    return (
      <View style={shell}>
        <ImageBackground source={{ uri: album.cover_url }} style={styles.cardBg} imageStyle={styles.cardImg}>
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.78)"]} style={styles.cardGrad}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {album.title}
            </Text>
          </LinearGradient>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={shell}>
      <View style={[styles.cardBg, styles.cardFallback]}>
        <FolderOpen color={colors.muted} size={elevated ? 26 : 18} />
        <Text style={styles.cardTitleFallback} numberOfLines={2}>
          {album.title}
        </Text>
      </View>
    </View>
  );
}

function useCardStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: {
      borderRadius: radius.lg,
      overflow: "hidden" as const,
      backgroundColor: c.card,
    },
    cardElevated: {
      ...cardShadow(c),
      shadowOpacity: 0.45,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 16,
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.28)",
    },
    cardBg: { flex: 1, justifyContent: "flex-end" as const },
    cardImg: { borderRadius: radius.lg },
    cardGrad: {
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    cardTitle: {
      color: "#fff",
      fontWeight: "700" as const,
      fontSize: 10 * fontScale,
      textShadowColor: "rgba(0,0,0,0.45)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    cardFallback: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      backgroundColor: c.tintBlue,
      padding: 8,
    },
    cardTitleFallback: {
      color: c.foreground,
      fontWeight: "700" as const,
      fontSize: 10 * fontScale,
      textAlign: "center" as const,
    },
  }));
}

export type ChildAlbumCardAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};
