import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";

function useUiStyles() {
  return useThemedStyles((colors, fontScale) => ({
    wrap: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    eyebrow: {
      fontSize: 12 * fontScale,
      color: colors.muted,
      fontWeight: "600" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 22 * fontScale,
      fontWeight: "700" as const,
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14 * fontScale,
      color: colors.muted,
      marginTop: 4,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      ...cardShadow(colors),
    },
    chip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    chipActive: {
      backgroundColor: colors.tintBlue,
      borderColor: colors.brand,
    },
    chipText: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: colors.muted },
    chipTextActive: { color: colors.brand },
    fieldLabelBlock: {
      fontSize: 14 * fontScale,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 17 * fontScale,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 14,
      letterSpacing: -0.2,
    },
    primaryBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.lg,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      minHeight: 48,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryBtnText: {
      color: colors.white,
      fontSize: 16 * fontScale,
      fontWeight: "700" as const,
    },
    secondaryBtn: {
      borderRadius: radius.lg,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    secondaryBtnText: {
      fontSize: 14 * fontScale,
      fontWeight: "600" as const,
      color: colors.foreground,
      lineHeight: 18 * fontScale,
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: "center" as const },
      }),
    },
    field: {
      gap: 6,
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 14 * fontScale,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    inputWrap: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      minHeight: 52,
      justifyContent: "center" as const,
    },
    input: {
      flex: 1,
      fontSize: 16 * fontScale,
      color: colors.foreground,
      paddingVertical: 12,
    },
  }));
}

/** Nút tròn góc phải header (khớp web: album + thêm). */
export function HeaderIconButton({
  onPress,
  accessibilityLabel,
  variant = "outline",
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  variant?: "outline" | "primary";
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isPrimary ? colors.brand : colors.card,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.cardBorder,
      }}
    >
      {children}
    </Pressable>
  );
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  back,
  showBack,
  right,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: string;
  /** Tab gốc: false để ẩn nút back dù stack có history. */
  showBack?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useUiStyles();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (back) router.replace(back as never);
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        {showBack !== false && (back !== undefined || router.canGoBack()) && (
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ChevronLeft color={colors.foreground} size={24} />
          </Pressable>
        )}
        <View style={styles.headerText}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useUiStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const styles = useUiStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const styles = useUiStyles();
  const { s } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.primaryBtnDisabled,
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={styles.primaryBtnText}>{loading ? s.common.processing : label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const styles = useUiStyles();
  const { s } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.secondaryBtn,
        (disabled || loading) && styles.primaryBtnDisabled,
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={styles.secondaryBtnText}>{loading ? s.common.processing : label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: string }) {
  const styles = useUiStyles();
  return <Text style={styles.fieldLabelBlock}>{children}</Text>;
}

export function SelectChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  const styles = useUiStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  multiline?: boolean;
}) {
  const styles = useUiStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, multiline && { minHeight: 100, alignItems: "flex-start" }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          placeholderTextColor={colors.muted}
          style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        />
      </View>
    </View>
  );
}
