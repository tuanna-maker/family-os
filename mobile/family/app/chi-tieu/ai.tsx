import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { aiInsight } from "@mobile/api/ai-insight";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { listExpenses } from "@mobile/api/expenses";
import { inExpenseMonth, isRecordedExpense } from "@mobile/lib/expense-month";
import { normalizeCategoryKey } from "@mobile/lib/expense-category-key";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency, formatMonthYear } from "@mobile/i18n/format";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { getCategoryLabel, getCategoryMeta } from "@mobile/components/family/CategoryMeta";

function paramId(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export default function ExpenseAiInsightScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string | string[]; month?: string | string[] }>();
  const year = Number(paramId(params.year) ?? new Date().getFullYear());
  const month = Number(paramId(params.month) ?? new Date().getMonth());
  const styles = useStyles();
  const { familyId } = useFamilyContext();
  const { settings } = useExpenseSettings(familyId);
  const cats = settings?.categories;
  const { locale, s } = useI18n();
  const ex = s.expense;
  const dash = ex.dashboard;

  const q = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const allRows = q.data ?? [];
  const rows = useMemo(() => allRows.filter((r) => inExpenseMonth(r.spent_on, year, month)), [allRows, year, month]);
  const recordedRows = useMemo(() => rows.filter(isRecordedExpense), [rows]);
  const total = useMemo(() => recordedRows.reduce((s, r) => s + Number(r.amount), 0), [recordedRows]);

  const prevRows = useMemo(() => {
    const prev = new Date(year, month, 1);
    prev.setMonth(prev.getMonth() - 1);
    return allRows.filter((r) => inExpenseMonth(r.spent_on, prev.getFullYear(), prev.getMonth()));
  }, [allRows, year, month]);

  const catSums = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of recordedRows) {
      const k = normalizeCategoryKey(r.category ?? "other");
      out[k] = (out[k] ?? 0) + Number(r.amount);
    }
    return out;
  }, [recordedRows]);

  const categoryStats = useMemo(() => {
    const names = Object.keys(catSums);
    return names
      .map((name) => ({
        name,
        amount: catSums[name],
        meta: getCategoryMeta(name, cats),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [catSums, cats]);

  const monthLabel = formatMonthYear(year, month, locale);
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
    const budgetUsedPct = 0; // giữ đơn giản ở màn này
    bullets.push(dash.insightBudget(budgetUsedPct));
    return bullets;
  }, [catSums, prevRows, categoryStats, dash, locale, cats]);

  const aiQ = useQuery({
    queryKey: ["ai-insight", "expense", familyId, year, month],
    queryFn: async () => {
      const prompt = [
        `Hãy phân tích chi tiêu gia đình tháng ${monthLabel}.`,
        `Tổng chi: ${formatCurrency(total, locale)}.`,
        categoryStats.length
          ? `Top nhóm chi: ${categoryStats
              .slice(0, 5)
              .map((x) => `${getCategoryLabel(x.name, locale, cats)}=${formatCurrency(x.amount, locale)}`)
              .join(", ")}.`
          : "",
        "Hãy trả về 3-6 gạch đầu dòng gợi ý tối ưu chi tiêu, ngắn gọn.",
      ]
        .filter(Boolean)
        .join("\n");
      const res = await aiInsight({ prompt });
      return res.text;
    },
    enabled: !!familyId,
    staleTime: 60_000,
  });

  const aiIcon = useMemo(() => require("../../assets/gemini-1781685677184-Photoroom.png"), []);

  if (!familyId || q.isLoading) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={dash.aiTitle} back="/chi-tieu" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={dash.aiTitle} subtitle={monthLabel} back="/chi-tieu" alignTitleWithContent />

      <Card style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.iconWrap}>
            <Image source={aiIcon} style={styles.icon} contentFit="contain" cachePolicy="memory-disk" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{dash.aiTitle}</Text>
            <Text style={styles.heroSub}>{dash.monthSpend(monthLabel)}: {formatCurrency(total, locale)}</Text>
          </View>
        </View>
        <View style={styles.list}>
          {aiQ.isLoading ? (
            <Text style={styles.bullet}>• Đang phân tích…</Text>
          ) : aiQ.isError ? (
            <>
              <Text style={styles.aiErr}>AI lỗi: {(aiQ.error as Error)?.message ?? "Không rõ lỗi"}</Text>
              {insights.map((line) => (
                <Text key={line} style={styles.bullet}>
                  • {line}
                </Text>
              ))}
            </>
          ) : aiQ.data ? (
            aiQ.data
              .split(/\n+/)
              .map((l) => l.replace(/^[•\-\s]+/, "").trim())
              .filter(Boolean)
              .slice(0, 8)
              .map((line) => (
                <Text key={line} style={styles.bullet}>
                  • {line}
                </Text>
              ))
          ) : (
            insights.map((line) => (
              <Text key={line} style={styles.bullet}>
                • {line}
              </Text>
            ))
          )}
        </View>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>{s.common.back}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    hero: { marginTop: 12 },
    heroRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    icon: { width: 30, height: 30 },
    heroTitle: { fontSize: 16 * fontScale, fontWeight: "800" as const, color: c.foreground },
    heroSub: { marginTop: 4, fontSize: 12 * fontScale, color: c.muted, fontWeight: "600" as const },
    list: { marginTop: 12, gap: 8 },
    bullet: { fontSize: 13 * fontScale, color: c.foreground, lineHeight: 20 },
    aiErr: { fontSize: 12 * fontScale, color: c.emergency, fontWeight: "700" as const, marginBottom: 6 },
    backBtn: { marginTop: 16, alignSelf: "flex-start" as const, paddingVertical: 8, paddingHorizontal: 10 },
    backText: { fontSize: 13 * fontScale, fontWeight: "700" as const, color: c.brand },
  }));
}

