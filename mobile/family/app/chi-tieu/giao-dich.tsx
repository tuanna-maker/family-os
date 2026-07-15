import { Pressable, Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { deleteExpense, listExpenses } from "@mobile/api/expenses";
import { getCategoryLabel, getCategoryMeta } from "@mobile/components/family/CategoryMeta";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import { appAlert } from "@mobile/utils/alert";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { inExpenseMonth } from "@mobile/lib/expense-month";
import { toast } from "@mobile/utils/toast";

export default function GiaoDichScreen() {
  const router = useRouter();
  const { year: y, month: m } = useLocalSearchParams<{ year?: string; month?: string }>();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const ex = s.expense;
  const cs = ex.categorySettings;
  const c = s.common;
  const { familyId } = useFamilyContext();
  const { settings } = useExpenseSettings(familyId);
  const qc = useQueryClient();
  const styles = useStyles();

  const year = y ? parseInt(y, 10) : new Date().getFullYear();
  const month = m ? parseInt(m, 10) : new Date().getMonth();

  const q = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const rows = (q.data ?? [])
    .filter((r) => inExpenseMonth(r.spent_on, year, month))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const delMut = useMutation({
    mutationFn: (row: { id: string; source?: string }) => deleteExpense({ id: row.id, source: row.source }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      toast.success(c.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmDelete = (row: { id: string; title: string; source?: string }) => {
    appAlert(ex.deleteTitle, row.title, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.delete,
        style: "destructive",
        onPress: () => delMut.mutate({ id: row.id, source: row.source }),
      },
    ]);
  };

  const formatTxTime = (spentOn: string, createdAt: string) => {
    const d = new Date(spentOn.length > 10 ? spentOn : createdAt);
    const today = new Date();
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return ex.dashboard.today;
    if (d.toDateString() === yest.toDateString()) return ex.dashboard.yesterday;
    return d.toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", { day: "2-digit", month: "2-digit" });
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={cs.allTransactions} back="/chi-tieu" />
      {q.isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{ex.emptyList}</Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {rows.map((row, i) => {
            const cats = settings?.categories;
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
                  <Text style={styles.txAmount}>-{formatCurrency(Number(row.amount), locale)}</Text>
                  <Text style={styles.txTime}>{formatTxTime(row.spent_on, row.created_at)}</Text>
                </View>
                <Pressable
                  onPress={() => confirmDelete(row)}
                  hitSlop={8}
                  style={styles.delBtn}
                  disabled={delMut.isPending}
                >
                  <Trash2 color={colors.muted} size={16} />
                </Pressable>
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
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
    muted: { fontSize: 12 * fontScale, color: c.muted },
    delBtn: { padding: 4 },
  }));
}
