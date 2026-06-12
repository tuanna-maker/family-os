import { TextInput } from "react-native";
import { formatAmountInputChange } from "@mobile/lib/amount-input";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export function AmountInput({
  value,
  onChangeValue,
  placeholder,
  width = 132,
  fullWidth = false,
}: {
  value: string;
  onChangeValue: (formatted: string) => void;
  placeholder?: string;
  width?: number;
  fullWidth?: boolean;
}) {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const styles = useStyles(fullWidth ? undefined : width);

  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeValue(formatAmountInputChange(t, locale))}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      style={styles.input}
    />
  );
}

function useStyles(width?: number) {
  return useThemedStyles((c, fontScale) => ({
    input: {
      ...(width != null ? { width } : { width: "100%" as const }),
      minHeight: 36,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.mutedBg,
      fontSize: 14 * fontScale,
      color: c.foreground,
      textAlign: (width != null ? "right" : "left") as "left" | "right",
    },
  }));
}
