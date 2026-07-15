import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";

type Props = {
  uri: string | null;
  fallbackInitial: string;
  size?: number;
  disabled?: boolean;
  onPick: (uri: string) => Promise<void>;
  hint?: string;
};

export function AvatarUploadButton({
  uri,
  fallbackInitial,
  size = 64,
  disabled,
  onPick,
  hint,
}: Props) {
  const { colors } = useTheme();
  const styles = useAvatarStyles(size);
  const [busy, setBusy] = useState(false);
  const { s } = useI18n();
  const c = s.common;
  const hintText = hint ?? c.changeAvatarHint;

  const pick = async () => {
    if (disabled || busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(c.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setBusy(true);
    try {
      await onPick(result.assets[0].uri);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : c.uploadFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Pressable onPress={pick} disabled={disabled || busy} style={styles.wrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.img} />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.initial}>{fallbackInitial.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.overlay}>
          {busy ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Camera color={colors.white} size={size > 80 ? 18 : 14} />
          )}
        </View>
      </Pressable>
      {hintText ? (
        <Pressable onPress={pick} disabled={disabled || busy}>
          <Text style={styles.hint}>{busy ? c.loading : hintText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function useAvatarStyles(size: number) {
  return useThemedStyles((c, fontScale) => ({
    wrap: {
      width: size,
      height: size,
      borderRadius: size > 80 ? radius.xl : radius.lg,
      overflow: "hidden" as const,
      position: "relative" as const,
    },
    img: { width: size, height: size },
    fallback: {
      width: size,
      height: size,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.tintPurple,
    },
    initial: {
      fontSize: (size > 80 ? 28 : 22) * fontScale,
      fontWeight: "700" as const,
      color: c.foreground,
    },
    overlay: {
      position: "absolute" as const,
      right: 0,
      bottom: 0,
      width: size > 80 ? 34 : 28,
      height: size > 80 ? 34 : 28,
      borderRadius: size > 80 ? 17 : 14,
      backgroundColor: c.brand,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: c.card,
    },
    hint: {
      fontSize: 11 * fontScale,
      color: c.brand,
      fontWeight: "600" as const,
      marginTop: 6,
    },
  }));
}
