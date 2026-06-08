import { Pressable, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Plus, Sparkles, Trash2 } from "lucide-react-native";
import { deleteExpense, listExpenses } from "@mobile/api/expenses";
import { toast } from "@mobile/utils/toast";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState } from "@mobile/components/states";
import { BUDGET_MONTH_VND, getCategoryLabel, getCategoryMeta } from "@mobile/components/family/CategoryMeta";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function ChiTieuScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const ex = s.expense;
  const c = s.common;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const styles = useExpenseStyles();

  const q = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const rows = q.data ?? [];
  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const pct = Math.min(100, Math.round((total / BUDGET_MONTH_VND) * 100));
  const insight = pct > 90 ? ex.insightHigh : ex.insightOk;

  const catSums: Record<string, number> = {};
  for (const e of rows) {
    const cat = e.category ?? "Khác";
    catSums[cat] = (catSums[cat] ?? 0) + Number(e.amount);
  }
  const categoryStats = Object.keys(catSums)
    .map((name) => ({
      name,
      amount: catSums[name],
      meta: getCategoryMeta(name),
    }))
    .sort((a, b) => b.amount - a.amount);

  const delMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      toast.success(c.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={c.familyCore} title={ex.title} back="/(tabs)/gia-dinh" />

      <LinearGradient
        colors={[colors.brand, "#071A3D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryGrad}
      >
        <Text style={styles.summaryLabel}>{ex.totalThisMonth}</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(total, locale)}</Text>
        <Text style={styles.summarySub}>{c.onBudget(formatCurrency(BUDGET_MONTH_VND, locale))}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressHint}>{c.percentOfBudget(pct)}</Text>
      </LinearGradient>

      <View style={styles.insightCard}>
        <View style={styles.insightIcon}>
          <Sparkles color={colors.pink} size={16} />
        </View>
        <Text style={styles.insightText}>{insight}</Text>
      </View>

      {categoryStats.length > 0 && (
        <>
          <SectionHeader title={ex.byCategory} />
          <View style={styles.catGrid}>
            {categoryStats.map((cat) => (
              <View key={cat.name} style={styles.catCard}>
                <View style={styles.catTop}>
                  <Text style={styles.catEmoji}>{cat.meta.icon}</Text>
                  <View style={[styles.catDot, { backgroundColor: cat.meta.color }]} />
                </View>
                <Text style={styles.catName}>{getCategoryLabel(cat.name, locale)}</Text>
                <Text style={styles.catAmount}>{formatCurrency(cat.amount, locale)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.listTitle}>{ex.recent}</Text>
      <View style={styles.listActions}>
        <Pressable style={styles.scanBtn} onPress={() => router.push("/chi-tieu/scan")}>
          <Camera color={colors.white} size={16} />
          <Text style={styles.actionBtnText}>{ex.scanTitle}</Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={() => router.push("/chi-tieu/them")}>
          <Plus color={colors.foreground} size={16} />
          <Text style={styles.addBtnText}>{c.add}</Text>
        </Pressable>
      </View>

      {q.isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{ex.emptyList}</Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {rows.map((row, i) => {
            const meta = getCategoryMeta(row.category ?? "Khác");
            const isScan = row.source === "scan";
            const catLabel = getCategoryLabel(row.category ?? "Khác", locale);
            return (
              <Pressable
                key={row.id}
                style={[styles.txRow, i > 0 && styles.txBorder, isScan && { backgroundColor: colors.tintGreen }]}
                onPress={() => router.push({ pathname: "/chi-tieu/them", params: { id: row.id } })}
                onLongPress={() =>
                  appAlert(ex.deleteTitle, row.title, [
                    { text: c.cancel, style: "cancel" },
                    { text: c.delete, style: "destructive", onPress: () => delMut.mutate({ id: row.id }) },
                  ])
                }
              >
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: isScan ? "rgba(34,197,94,0.15)" : colors.mutedBg },
                  ]}
                >
                  <Text style={styles.txEmoji}>{isScan ? "✨" : meta.icon}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.txTitle} numberOfLines={1}>
                    {row.title}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {catLabel} · {row.spent_on}
                    {isScan ? ` · ${ex.scanAi}` : ""}
                  </Text>
                </View>
                <Text style={styles.txAmount}>-{formatCurrency(Number(row.amount), locale)}</Text>
                {row.source !== "scan" && (
                  <Pressable
                    onPress={() => delMut.mutate({ id: row.id })}
                    hitSlop={8}
                    style={styles.delBtn}
                  >
                    <Trash2 color={colors.muted} size={14} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </Card>
      )}

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useExpenseStyles() {
  return useThemedStyles((c, fontScale) => ({
    summaryGrad: { borderRadius: radius.xl, padding: 18, marginBottom: 14 },
    summaryLabel: {
      fontSize: 11 * fontScale,
      fontWeight: "700" as const,
      color: "rgba(255,255,255,0.7)",
      letterSpacing: 0.8,
    },
    summaryAmount: { fontSize: 28 * fontScale, fontWeight: "800" as const, color: c.white, marginTop: 4 },
    summarySub: { fontSize: 12 * fontScale, color: "rgba(255,255,255,0.7)", marginTop: 4 },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
      marginTop: 14,
      overflow: "hidden" as const,
    },
    progressFill: { height: "100%" as const, backgroundColor: c.white, borderRadius: 4 },
    progressHint: { fontSize: 11 * fontScale, color: "rgba(255,255,255,0.85)", marginTop: 6 },
    insightCard: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
      backgroundColor: c.tintPurple,
      borderRadius: radius.xl,
      padding: 14,
      marginBottom: 16,
    },
    insightIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    insightText: { flex: 1, fontSize: 14 * fontScale, color: c.foreground, lineHeight: 20 },
    catGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginBottom: 16 },
    catCard: {
      width: "47%" as const,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
    },
    catTop: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    catEmoji: { fontSize: 22 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catName: { fontSize: 12 * fontScale, color: c.muted, marginTop: 8 },
    catAmount: { fontSize: 14 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 2 },
    listTitle: {
      fontSize: 17 * fontScale,
      fontWeight: "700" as const,
      color: c.foreground,
      marginBottom: 10,
      letterSpacing: -0.2,
    },
    listActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 10,
      marginBottom: 12,
    },
    scanBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      backgroundColor: c.brand,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: radius.lg,
      minHeight: 44,
    },
    addBtn: {
      flexShrink: 0,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: radius.lg,
      minHeight: 44,
    },
    actionBtnText: { color: c.white, fontSize: 13 * fontScale, fontWeight: "700" as const },
    addBtnText: { color: c.foreground, fontSize: 13 * fontScale, fontWeight: "700" as const },
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
    muted: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    delBtn: { padding: 4 },
  }));
}
