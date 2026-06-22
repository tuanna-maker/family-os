import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { AmountInput } from "@mobile/components/expense/AmountInput";
import { ExpenseMonthNav } from "@mobile/components/expense/ExpenseMonthNav";
import { MonthPickerModal } from "@mobile/components/expense/MonthPickerModal";
import { getCategoryLabel, getCategoryMeta } from "@mobile/components/family/CategoryMeta";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import {
  formatAmountDigits,
  parseAmountDigits,
  resolveMonthBudgetTotal,
} from "@mobile/lib/amount-input";
import { getMonthBudget, monthKey } from "@mobile/lib/expense-settings";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { toast } from "@mobile/utils/toast";

export default function CaiDatNganSachScreen() {
  const router = useRouter();
  const { year: y, month: m } = useLocalSearchParams<{ year?: string; month?: string }>();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const bud = s.expense.budget;
  const { familyId } = useFamilyContext();
  const { settings, update, saveMut } = useExpenseSettings(familyId);
  const styles = useStyles();

  const now = new Date();
  const [year, setYear] = useState(y ? parseInt(y, 10) : now.getFullYear());
  const [month, setMonth] = useState(m ? parseInt(m, 10) : now.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [totalStr, setTotalStr] = useState("");
  const [byCat, setByCat] = useState<Record<string, string>>({});

  const cats = settings?.categories ?? [];
  const mk = monthKey(year, month);

  useEffect(() => {
    if (!settings) return;
    const b = getMonthBudget(settings, year, month);
    const displayTotal = resolveMonthBudgetTotal(b);
    setTotalStr(displayTotal > 0 ? formatAmountDigits(displayTotal, locale) : "");
    const next: Record<string, string> = {};
    for (const c of cats) {
      const v = b.byCategory[c.key];
      next[c.key] = v != null && v > 0 ? formatAmountDigits(v, locale) : "";
    }
    setByCat(next);
  }, [settings, year, month, cats.length, locale]);

  const catSum = useMemo(
    () => Object.values(byCat).reduce((s, v) => s + parseAmountDigits(v), 0),
    [byCat],
  );

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const save = () => {
    if (!settings) return;
    const byCategory: Record<string, number> = {};
    for (const [k, v] of Object.entries(byCat)) {
      const n = parseAmountDigits(v);
      if (n > 0) byCategory[k] = n;
    }
    const total = parseAmountDigits(totalStr) || catSum;
    update((prev) => ({
      ...prev,
      budgets: {
        ...prev.budgets,
        [mk]: { total, byCategory },
      },
    }));
    toast.success(bud.saved);
    router.back();
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={24} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{bud.settingsTitle}</Text>
        <Pressable onPress={save} disabled={saveMut.isPending} hitSlop={8}>
          <Text style={styles.saveBtn}>{bud.save}</Text>
        </Pressable>
      </View>

      <ExpenseMonthNav
        year={year}
        month={month}
        locale={locale}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onPressLabel={() => setPickerOpen(true)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{bud.totalBudget}</Text>
          <AmountInput value={totalStr} onChangeValue={setTotalStr} placeholder="0" />
        </View>
        <Text style={styles.hint}>{bud.totalByCategory(formatCurrency(catSum, locale))}</Text>

        {cats.map((cat) => {
          const meta = getCategoryMeta(cat.key, cats);
          const val = byCat[cat.key] ?? "";
          return (
            <View key={cat.key} style={styles.catRow}>
              <View style={styles.catLeft}>
                <Text style={styles.catIcon}>{meta.icon}</Text>
                <Text style={styles.catName} numberOfLines={1}>
                  {getCategoryLabel(cat.key, locale, cats)}
                </Text>
              </View>
              <AmountInput
                value={val}
                onChangeValue={(t) => setByCat((p) => ({ ...p, [cat.key]: t }))}
                placeholder={bud.notSet}
              />
            </View>
          );
        })}
      </ScrollView>

      <MonthPickerModal
        visible={pickerOpen}
        year={year}
        month={month}
        onClose={() => setPickerOpen(false)}
        onSelect={(ny, nm) => {
          setYear(ny);
          setMonth(nm);
        }}
      />
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    topBar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingTop: 52,
      paddingBottom: 6,
    },
    topTitle: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground },
    saveBtn: { fontSize: 15 * fontScale, fontWeight: "700" as const, color: c.brand },
    totalRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: 4,
      gap: 12,
    },
    totalLabel: { fontSize: 15 * fontScale, fontWeight: "700" as const, color: c.foreground, flex: 1 },
    hint: { fontSize: 11 * fontScale, color: c.muted, marginBottom: 8, marginTop: 2 },
    catRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    catLeft: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 8, minWidth: 0 },
    catIcon: { fontSize: 17 },
    catName: { fontSize: 14 * fontScale, color: c.foreground, flex: 1 },
  }));
}
