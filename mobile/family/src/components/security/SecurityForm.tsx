import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { PageHeader } from "@mobile/components/ui";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { getTabBarBottomInset } from "@mobile/theme/tabBar";

export function SecurityServiceScreen({
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = "Gửi yêu cầu",
  busy,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles((c, fontScale) => ({
    scroll: { paddingHorizontal: 16, gap: 12 },
    submit: {
      marginTop: 4,
      backgroundColor: c.brand,
      borderRadius: radius.xl,
      paddingVertical: 15,
      alignItems: "center" as const,
      opacity: busy ? 0.6 : 1,
    },
    submitText: { color: c.white, fontSize: 16 * fontScale, fontWeight: "700" as const },
  }));

  return (
    <Screen scroll={false} contentStyle={{ paddingTop: 0 }} insetTabBar={false}>
      <PageHeader title={title} subtitle={subtitle} back="/(tabs)/bao-an" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: getTabBarBottomInset(insets) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
        <Pressable style={styles.submit} onPress={onSubmit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemedStyles((c, fontScale) => ({
    wrap: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      marginBottom: 4,
    },
    title: {
      fontSize: 14 * fontScale,
      fontWeight: "700" as const,
      color: c.foreground,
      marginBottom: 12,
    },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export function CostSummary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    wrap: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      borderRadius: radius.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      marginBottom: 4,
    },
    label: { fontSize: 14 * fontScale, color: c.muted },
    value: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: accent ? c.success : c.foreground },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "numeric";
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    wrap: { marginBottom: 12 },
    label: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.muted, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: multiline ? 12 : 13,
      fontSize: 15 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      backgroundColor: c.surfaceElevated,
      minHeight: multiline ? 88 : undefined,
      textAlignVertical: multiline ? ("top" as const) : ("center" as const),
    },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function PlanCardSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string; sub?: string; price: string }[];

  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    wrap: { marginBottom: 4 },
    label: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.muted, marginBottom: 8 },
    card: {
      width: 152,
      marginRight: 8,
      padding: 10,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceElevated,
    },
    cardActive: { borderColor: c.brand, backgroundColor: c.tintBlue },
    cardRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    icon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      backgroundColor: "transparent",
      flexShrink: 0,
      marginTop: 1,
    },
    iconActive: { borderColor: c.brand, backgroundColor: c.brand },
    cardBody: { flex: 1, minWidth: 0 },
    cardLabel: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.foreground, lineHeight: 16 },
    cardSub: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    cardPrice: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.foreground, marginTop: 4 },
    cardPriceActive: { color: c.brand },
    check: { marginLeft: 2, marginTop: 2 },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
        {options.map((opt) => {
          const active = opt.id === value;
          const showSub = opt.sub && opt.sub !== opt.label;
          return (
            <Pressable
              key={opt.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => onChange(opt.id)}
            >
              <View style={styles.cardRow}>
                <View style={[styles.icon, active && styles.iconActive]} />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardLabel, active && { color: colors.brand }]} numberOfLines={2}>
                    {opt.label}
                  </Text>
                  {showSub ? <Text style={styles.cardSub}>{opt.sub}</Text> : null}
                  <Text style={[styles.cardPrice, active && styles.cardPriceActive]}>{opt.price}</Text>
                </View>
                {active ? (
                  <View style={styles.check}>
                    <Check color={colors.brand} size={14} strokeWidth={3} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  otherId,
  otherValue,
  onOtherChange,
  otherPlaceholder = "Nhập đối tượng cụ thể",
}: {
  label: string;
  options: { id: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Khi chọn chip này, hiện ô nhập bắt buộc bên dưới */
  otherId?: T;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
  otherPlaceholder?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    wrap: { marginBottom: 4 },
    label: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.muted, marginBottom: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceElevated,
      marginRight: 8,
    },
    chipActive: { borderColor: c.brand, backgroundColor: c.tintBlue },
    chipText: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.foreground },
    chipSub: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
  }));

  const showOther = otherId != null && value === otherId;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt.id)}
            >
              <Text style={[styles.chipText, active && { color: colors.brand }]}>{opt.label}</Text>
              {opt.sub ? <Text style={styles.chipSub}>{opt.sub}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {showOther && onOtherChange ? (
        <FormField
          label="Mô tả đối tượng"
          value={otherValue ?? ""}
          onChangeText={onOtherChange}
          placeholder={otherPlaceholder}
        />
      ) : null}
    </View>
  );
}

export function FormSwitch({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const styles = useThemedStyles((c, fontScale) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      marginTop: 4,
    },
    label: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground },
    desc: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2, maxWidth: 260 },
  }));

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function formatVnd(n: number) {
  return n === 0 ? "Miễn phí" : `${n.toLocaleString("vi-VN")}đ`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
