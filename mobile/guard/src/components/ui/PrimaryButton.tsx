import { ActivityIndicator, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/** Nút primary — dùng TouchableOpacity + nền brand (ổn định trên Android + NativeWind). */
export function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const { colors } = useTheme();
  const off = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.88}
      style={[
        styles.btn,
        { backgroundColor: colors.brand },
        off && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
