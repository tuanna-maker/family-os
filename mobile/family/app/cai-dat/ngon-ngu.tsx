import { Pressable, Text, View } from "react-native";
import { Check, Globe } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { useAppPrefs, type AppLocale } from "@mobile/hooks/useAppPrefs";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { toast } from "@mobile/utils/toast";

const OPTIONS: Array<{ id: AppLocale; label: string; native: string }> = [
  { id: "vi", label: "Tiếng Việt", native: "Vietnamese" },
  { id: "en", label: "English", native: "Tiếng Anh" },
];

export default function NgonNguScreen() {
  const { locale, setLocale } = useAppPrefs();
  const { s } = useI18n();
  const { colors } = useTheme();
  const styles = useLangStyles();

  const pick = (id: AppLocale) => {
    setLocale(id);
    toast.success(id === "vi" ? s.language.pickedVi : s.language.pickedEn);
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={s.language.title} eyebrow={s.language.eyebrow} back="/(tabs)/tai-khoan" />

      <SectionHeader title={s.language.section} subtitle={s.language.sectionSub} />

      <Card style={styles.card}>
        {OPTIONS.map((opt, i) => {
          const selected = locale === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.row, i < OPTIONS.length - 1 && styles.rowBorder]}
              onPress={() => pick(opt.id)}
            >
              <View style={styles.iconWrap}>
                <Globe color={colors.brand} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{opt.label}</Text>
                <Text style={styles.sub}>{opt.native}</Text>
              </View>
              {selected ? <Check color={colors.brand} size={20} /> : null}
            </Pressable>
          );
        })}
      </Card>

      <Text style={styles.note}>{s.language.note}</Text>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useLangStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: { padding: 0, overflow: "hidden" as const },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 16 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    label: { fontWeight: "700" as const, color: c.foreground, fontSize: 15 * fontScale },
    sub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    note: { fontSize: 11 * fontScale, color: c.muted, marginTop: 12, lineHeight: 16, paddingHorizontal: 4 },
  }));
}
