import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

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
  hint = "Chạm để đổi ảnh đại diện",
}: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (disabled || busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAppAlert({ title: "Lỗi", message: "Cần quyền truy cập thư viện ảnh." });
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
      showAppAlert({
        title: "Lỗi",
        message: e instanceof Error ? e.message : "Không tải được ảnh",
      });
    } finally {
      setBusy(false);
    }
  };

  const r = size > 80 ? radius.xl : radius.lg;
  const badge = size > 80 ? 34 : 28;

  return (
    <View style={{ alignItems: "center" }}>
      <Pressable onPress={pick} disabled={disabled || busy}>
        <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden" }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: size, height: size }} />
          ) : (
            <View
              style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.tintPurple,
              }}
            >
              <Text style={{ fontSize: size > 80 ? 28 : 22, fontWeight: "700", color: colors.foreground }}>
                {fallbackInitial.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              backgroundColor: colors.brand,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: colors.card,
            }}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Camera color={colors.white} size={size > 80 ? 18 : 14} />
            )}
          </View>
        </View>
      </Pressable>
      {hint ? (
        <Pressable onPress={pick} disabled={disabled || busy}>
          <Text style={[styles.hint, { color: colors.brand }]}>{busy ? "Đang tải…" : hint}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 11, fontWeight: "600", marginTop: 6 },
});
