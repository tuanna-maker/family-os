import { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Eye, EyeOff, Sparkles } from "lucide-react-native";
import { listExpenses } from "@mobile/api/expenses";
import { Screen } from "@mobile/components/Screen";
import { Card } from "@mobile/components/ui";
import { CategoryPager } from "@mobile/components/expense/CategoryPager";
import { inExpenseMonth, isRecordedExpense } from "@mobile/lib/expense-month";
import { LoadingState } from "@mobile/components/states";
import { getCategoryLabel, getCategoryMeta } from "@mobile/components/family/CategoryMeta";
import { normalizeCategoryKey } from "@mobile/lib/expense-category-key";
import { ExpenseDonutChart } from "@mobile/components/expense/ExpenseDonutChart";
import { ExpenseBottomBar } from "@mobile/components/expense/ExpenseBottomBar";
import { MonthPickerModal } from "@mobile/components/expense/MonthPickerModal";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import { getMonthBudget } from "@mobile/lib/expense-settings";
import { resolveMonthBudgetTotal } from "@mobile/lib/amount-input";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency, formatMonthYear } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChiTieuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const ex = s.expense;
  const dash = ex.dashboard;
  const bud = ex.budget;
  const { familyId } = useFamilyContext();
  const { settings } = useExpenseSettings(familyId);
  const styles = useExpenseStyles();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hideAmount, setHideAmount] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const cats = settings?.categories;

  const q = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const allRows = q.data ?? [];
  const rows = useMemo(
    () => allRows.filter((r) => inExpenseMonth(r.spent_on, year, month)),
    [allRows, year, month],
  );
  const recordedRows = useMemo(() => rows.filter(isRecordedExpense), [rows]);
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    [rows],
  );
  const prevRows = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    return allRows.filter((r) => inExpenseMonth(r.spent_on, py, pm) && isRecordedExpense(r));
  }, [allRows, year, month]);

  const monthBudget = settings ? getMonthBudget(settings, year, month) : { total: 0, byCategory: {} };
  const budgetTotal = resolveMonthBudgetTotal(monthBudget);

  const total = recordedRows.reduce((sum, r) => sum + Number(r.amount), 0);
  const prevTotal = prevRows.reduce((sum, r) => sum + Number(r.amount), 0);
  const momPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
  const budgetOver = budgetTotal > 0 && total > budgetTotal;
  const budgetOverAmt = budgetOver ? total - budgetTotal : 0;
  const budgetLeft = budgetOver ? 0 : Math.max(0, budgetTotal - total);
  const budgetLeftPct = budgetTotal > 0 ? Math.round((budgetLeft / budgetTotal) * 100) : 0;
  const budgetUsedPct = budgetTotal > 0 ? Math.min(100, Math.round((total / budgetTotal) * 100)) : 0;

  const catSums: Record<string, number> = {};
  for (const e of recordedRows) {
    const cat = normalizeCategoryKey(e.category ?? "other");
    catSums[cat] = (catSums[cat] ?? 0) + Number(e.amount);
  }
  const categoryStats = Object.keys(catSums)
    .map((name) => ({
      name,
      amount: catSums[name],
      meta: getCategoryMeta(name, cats),
      pct: total > 0 ? Math.round((catSums[name] / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthLabel = formatMonthYear(year, month, locale);
  const amt = (n: number) => (hideAmount ? "••••••" : formatCurrency(n, locale));

  const insights = useMemo(() => {
    const bullets: string[] = [];
    const eatNow = catSums.dining ?? 0;
    const eatPrev = prevRows
      .filter((r) => normalizeCategoryKey(r.category ?? "other") === "dining")
      .reduce((s, r) => s + Number(r.amount), 0);
    if (eatPrev > 0 && eatNow < eatPrev) {
      bullets.push(dash.insightEatDown(Math.round(((eatPrev - eatNow) / eatPrev) * 100)));
    }
    if (categoryStats[0]) {
      bullets.push(
        dash.insightTopCat(
          getCategoryLabel(categoryStats[0].name, locale, cats),
          formatCurrency(categoryStats[0].amount, locale),
        ),
      );
    }
    bullets.push(dash.insightBudget(budgetOver ? 100 : budgetUsedPct));
    return bullets.slice(0, 3);
  }, [catSums, prevRows, categoryStats, dash, locale, budgetUsedPct, budgetOver, cats]);

  const formatTxTime = (spentOn: string, createdAt: string) => {
    const d = new Date(spentOn.length > 10 ? spentOn : createdAt);
    const today = new Date();
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return dash.today;
    if (d.toDateString() === yest.toDateString()) return dash.yesterday;
    return d.toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const onShare = async () => {
    try {
      await Share.share({ message: dash.shareMessage(monthLabel, formatCurrency(total, locale)) });
    } catch {
      /* cancelled */
    }
  };

  const onReport = () => {
    appAlert(dash.reportTitle, dash.reportBody(monthLabel, formatCurrency(total, locale), rows.length));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen contentStyle={{ paddingTop: 0, paddingBottom: 100 + insets.bottom }}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 48) }]}>
          <Pressable onPress={() => router.push("/(tabs)/gia-dinh")} hitSlop={12} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>{ex.title}</Text>
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={8} style={styles.monthBtn}>
            <Text style={styles.monthText}>{monthLabel}</Text>
          </Pressable>
          <Pressable onPress={() => setHideAmount((v) => !v)} hitSlop={12} style={styles.eyeBtn}>
            {hideAmount ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
          </Pressable>
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>{dash.monthSpend(monthLabel)}</Text>
              <Text style={styles.summaryAmount}>{amt(total)}</Text>
              <Text style={[styles.trend, { color: momPct <= 0 ? colors.success : colors.emergency }]}>
                {dash.vsPrevMonth(momPct)}
              </Text>
              <View
                style={[
                  styles.budgetPill,
                  budgetOver && { backgroundColor: colors.tintOrange },
                ]}
              >
                <Text style={[styles.budgetPillText, budgetOver && { color: colors.emergency }]}>
                  {budgetOver
                    ? bud.overspent(amt(budgetOverAmt))
                    : dash.budgetRemaining(amt(budgetLeft), budgetLeftPct)}
                </Text>
              </View>
            </View>
            {categoryStats.length > 0 ? (
              <View style={styles.chartCol}>
                <ExpenseDonutChart
                  slices={categoryStats.slice(0, 7).map((cat) => ({
                    label: cat.name,
                    value: cat.amount,
                    color: cat.meta.color,
                    pct: cat.pct,
                  }))}
                  centerLabel={dash.groupCount(categoryStats.length)}
                />
              </View>
            ) : null}
          </View>
          {categoryStats.length > 0 ? (
            <View style={styles.legend}>
              {categoryStats.slice(0, 5).map((cat) => (
                <View key={cat.name} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: cat.meta.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {getCategoryLabel(cat.name, locale, cats)}
                  </Text>
                  <Text style={styles.legendPct}>{cat.pct}%</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Sparkles color={colors.brand} size={16} />
            </View>
            <Text style={styles.aiTitle}>{dash.aiTitle}</Text>
          </View>
          {insights.map((line, i) => (
            <Text key={i} style={styles.aiBullet}>
              • {line}
            </Text>
          ))}
        </View>

        {categoryStats.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitleInline}>{dash.categoryGroups}</Text>
            </View>
            <View style={{ marginHorizontal: 16 }}>
            <CategoryPager
              items={categoryStats.map((cat) => ({
                key: cat.name,
                icon: cat.meta.icon,
                label: getCategoryLabel(cat.name, locale, cats),
                amount: amt(cat.amount),
              }))}
            />
            </View>
          </>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitleInline}>{ex.recent}</Text>
          {sortedRows.length > 5 ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/chi-tieu/giao-dich",
                  params: { year: String(year), month: String(month) },
                })
              }
              hitSlop={8}
            >
              <Text style={styles.viewAll}>{dash.viewAll}</Text>
            </Pressable>
          ) : null}
        </View>

        {q.isLoading ? (
          <LoadingState />
        ) : sortedRows.length === 0 ? (
          <Card>
            <Text style={styles.muted}>{ex.emptyList}</Text>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            {sortedRows.slice(0, 5).map((row, i) => {
              const meta = getCategoryMeta(row.category ?? "other", cats);
              const isScan = row.source === "scan";
              const catLabel = getCategoryLabel(row.category ?? "other", locale, cats);
              return (
                <Pressable
                  key={row.id}
                  style={[styles.txRow, i > 0 && styles.txBorder, isScan && { backgroundColor: colors.tintGreen }]}
                  onPress={() => router.push({ pathname: "/chi-tieu/them", params: { id: row.id } })}
                >
                  <View style={[styles.txIcon, { backgroundColor: isScan ? "rgba(34,197,94,0.15)" : colors.mutedBg }]}>
                    <Text style={styles.txEmoji}>{isScan ? "✨" : meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {catLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.txAmount}>-{amt(Number(row.amount))}</Text>
                    <Text style={styles.txTime}>{formatTxTime(row.spent_on, row.created_at)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}
      </Screen>

      <ExpenseBottomBar
        labels={{
          add: dash.bottomAdd,
          report: dash.bottomReport,
          scan: dash.bottomScan,
          budget: dash.bottomBudget,
          share: dash.bottomShare,
        }}
        onAdd={() => router.push("/chi-tieu/them")}
        onReport={onReport}
        onScan={() => router.push("/chi-tieu/scan")}
        onBudget={() => router.push("/chi-tieu/ngan-sach")}
        onShare={onShare}
      />

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
    </View>
  );
}

function useExpenseStyles() {
  return useThemedStyles((c, fontScale) => ({
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    backBtn: { padding: 4 },
    eyeBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18 * fontScale, fontWeight: "700" as const, color: c.foreground },
    monthBtn: { paddingVertical: 4, paddingHorizontal: 2 },
    monthText: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground },
    summaryCard: { marginHorizontal: 16, marginBottom: 12, padding: 16 },
    summaryRow: { flexDirection: "row" as const, gap: 12 },
    summaryLabel: { fontSize: 12 * fontScale, color: c.muted, fontWeight: "600" as const },
    summaryAmount: { fontSize: 26 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 4 },
    trend: { fontSize: 12 * fontScale, fontWeight: "600" as const, marginTop: 6 },
    budgetPill: {
      marginTop: 10,
      backgroundColor: c.tintGreen,
      borderRadius: radius.md,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: "flex-start" as const,
    },
    budgetPillText: { fontSize: 11 * fontScale, color: c.success, fontWeight: "600" as const },
    chartCol: { alignItems: "center" as const, justifyContent: "center" as const },
    legend: { marginTop: 14, gap: 6 },
    legendRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { flex: 1, fontSize: 12 * fontScale, color: c.muted },
    legendPct: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.foreground },
    aiCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 14,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.brand,
      backgroundColor: c.tintBlue,
    },
    aiHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 8 },
    aiIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: c.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    aiTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.brand },
    aiBullet: { fontSize: 13 * fontScale, color: c.foreground, lineHeight: 20, marginTop: 4 },
    sectionHead: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    sectionTitleInline: {
      fontSize: 16 * fontScale,
      fontWeight: "700" as const,
      color: c.foreground,
    },
    viewAll: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.brand },
    txRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, padding: 14 },
    txBorder: { borderTopWidth: 1, borderTopColor: c.cardBorder },
    txIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    txEmoji: { fontSize: 18 },
    txTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    txAmount: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    txTime: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
    muted: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
  }));
}
