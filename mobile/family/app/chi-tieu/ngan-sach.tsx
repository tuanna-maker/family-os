import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, SlidersHorizontal } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { PageHeader } from "@mobile/components/ui";
import { ExpenseMonthNav } from "@mobile/components/expense/ExpenseMonthNav";
import { MonthPickerModal } from "@mobile/components/expense/MonthPickerModal";
import { listExpenses } from "@mobile/api/expenses";
import { getCategoryLabel, getCategoryMeta } from "@mobile/components/family/CategoryMeta";
import { normalizeCategoryKey } from "@mobile/lib/expense-category-key";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import { resolveMonthBudgetTotal } from "@mobile/lib/amount-input";
import { getMonthBudget } from "@mobile/lib/expense-settings";
import { inExpenseMonth, isRecordedExpense } from "@mobile/lib/expense-month";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function NganSachScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const bud = s.expense.budget;
  const { familyId } = useFamilyContext();
  const { settings } = useExpenseSettings(familyId);
  const styles = useStyles();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);

  const q = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const spentByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of q.data ?? []) {
      if (!isRecordedExpense(r)) continue;
      if (!inExpenseMonth(r.spent_on, year, month)) continue;
      const k = normalizeCategoryKey(r.category ?? "other");
      map[k] = (map[k] ?? 0) + Number(r.amount);
    }
    return map;
  }, [q.data, year, month]);

  const monthBudget = settings ? getMonthBudget(settings, year, month) : { total: 0, byCategory: {} };
  const cats = settings?.categories ?? [];
  const budgetBySlug: Record<string, number> = {};
  for (const [k, v] of Object.entries(monthBudget.byCategory)) {
    if (v <= 0) continue;
    const slug = normalizeCategoryKey(k);
    budgetBySlug[slug] = (budgetBySlug[slug] ?? 0) + v;
  }
  const budgetKeys = Object.keys(budgetBySlug);
  const spentKeys = Object.keys(spentByCat).filter((k) => spentByCat[k] > 0);
  const rowKeys = [...new Set([...budgetKeys, ...spentKeys])].sort((a, b) => {
    const diff = (spentByCat[b] ?? 0) - (spentByCat[a] ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const totalSpent = Object.values(spentByCat).reduce((s, n) => s + n, 0);
  const totalBudget = resolveMonthBudgetTotal(monthBudget);
  const totalOver = totalBudget > 0 && totalSpent > totalBudget;
  const totalOverAmt = totalOver ? totalSpent - totalBudget : 0;

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const rows = [
    { key: "__total__", label: bud.totalBudget, budget: totalBudget, spent: totalSpent, icon: null },
    ...rowKeys.map((key) => {
      const meta = getCategoryMeta(key, cats);
      return {
        key,
        label: getCategoryLabel(key, locale, cats),
        budget: budgetBySlug[key] ?? 0,
        spent: spentByCat[key] ?? 0,
        icon: meta.icon,
      };
    }),
  ];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={bud.title}
        back="/chi-tieu"
        right={
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/chi-tieu/cai-dat-ngan-sach",
                params: { year: String(year), month: String(month) },
              } as never)
            }
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <SlidersHorizontal size={22} color={colors.brand} />
          </Pressable>
        }
      />

      <ExpenseMonthNav
        year={year}
        month={month}
        locale={locale}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onPressLabel={() => setPickerOpen(true)}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {rows.map((row, i) => {
          const over = row.budget > 0 && row.spent > row.budget;
          const pct =
            row.budget > 0 ? Math.min(100, Math.round((row.spent / row.budget) * 100)) : row.spent > 0 ? 100 : 0;
          const left = row.budget - row.spent;
          const isTotal = row.key === "__total__";

          return (
            <View key={row.key}>
              <Pressable style={[styles.row, i > 0 && styles.rowBorder]} onPress={() => {}}>
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    {row.icon ? <Text style={styles.icon}>{row.icon}</Text> : null}
                    <Text style={styles.rowTitle}>{row.label}</Text>
                  </View>
                  <Text style={[styles.remaining, over && { color: colors.emergency }]}>
                    {over
                      ? bud.overspent(formatCurrency(Math.abs(left), locale))
                      : bud.remaining(formatCurrency(Math.max(0, left), locale))}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <Text style={[styles.pct, over && { color: colors.emergency }]}>{pct}%</Text>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: over ? colors.emergency : colors.brand,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.sub}>{bud.budgetLine(formatCurrency(row.budget, locale))}</Text>
                  <Text style={[styles.sub, over && { color: colors.emergency }]}>
                    {bud.spentLine(formatCurrency(row.spent, locale))}
                  </Text>
                </View>
                {!isTotal ? <ChevronRight size={16} color={colors.muted} style={styles.chevron} /> : null}
              </Pressable>

              {isTotal && totalOver ? (
                <View style={styles.warnBox}>
                  <AlertTriangle size={16} color={colors.emergency} />
                  <Text style={styles.warnText}>
                    {bud.overBudgetWarning(formatCurrency(totalOverAmt, locale))}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <MonthPickerModal
        visible={pickerOpen}
        year={year}
        month={month}
        onClose={() => setPickerOpen(false)}
        onSelect={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: {
      paddingVertical: 10,
      position: "relative" as const,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: c.cardBorder },
    rowTop: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    rowLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flex: 1 },
    icon: { fontSize: 18 },
    rowTitle: { fontSize: 15 * fontScale, fontWeight: "700" as const, color: c.foreground },
    remaining: { fontSize: 12 * fontScale, color: c.muted },
    barTrack: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginTop: 6 },
    pct: { fontSize: 11 * fontScale, color: c.muted, width: 32, textAlign: "right" as const },
    barBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.mutedBg,
      overflow: "hidden" as const,
    },
    barFill: { height: "100%" as const, borderRadius: 3 },
    rowBottom: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      marginTop: 4,
      paddingRight: 20,
    },
    sub: { fontSize: 11 * fontScale, color: c.muted },
    chevron: { position: "absolute" as const, right: 0, top: "50%" as const },
    warnBox: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 8,
      marginTop: 4,
      marginBottom: 8,
      padding: 10,
      borderRadius: radius.md,
      backgroundColor: c.tintOrange,
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.25)",
    },
    warnText: { flex: 1, fontSize: 12 * fontScale, color: c.emergency, lineHeight: 18 },
  }));
}
