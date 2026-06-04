import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ScanLine } from "lucide-react-native";
import { deleteExpense } from "@mobile/api/expenses";
import { toast } from "@mobile/utils/toast";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listExpenses } from "@mobile/api/expenses";
import { colors, radius } from "@mobile/theme/colors";

function formatVnd(n: number) {
  return `${(n ?? 0).toLocaleString("vi-VN")}đ`;
}

export default function ChiTieuScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const total = (q.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const delMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      toast.success("Đã xóa");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Chi tiêu gia đình" back="/(tabs)/gia-dinh" />

      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>Tổng (danh sách hiện tại)</Text>
        <Text style={styles.summaryAmount}>{formatVnd(total)}</Text>
      </Card>

      {(q.data ?? []).length === 0 ? (
        <Card>
          <Text style={{ color: colors.muted }}>Chưa có khoản chi nào.</Text>
        </Card>
      ) : (
        (q.data ?? []).map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push({ pathname: "/chi-tieu/them", params: { id: row.id } })}
            onLongPress={() =>
              Alert.alert("Xóa khoản chi?", row.title, [
                { text: "Huỷ", style: "cancel" },
                { text: "Xóa", style: "destructive", onPress: () => delMut.mutate({ id: row.id }) },
              ])
            }
          >
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{row.title}</Text>
                <Text style={styles.sub}>{row.category ?? "Khác"} · {row.spent_on}</Text>
              </View>
              <Text style={styles.amount}>{formatVnd(Number(row.amount))}</Text>
            </Card>
          </Pressable>
        ))
      )}

      <Pressable style={styles.scanBtn} onPress={() => router.push("/chi-tieu/scan")}>
        <ScanLine color={colors.brand} size={20} />
        <Text style={styles.scanText}>Quét hoá đơn (AI)</Text>
      </Pressable>

      <Pressable style={styles.fab} onPress={() => router.push("/chi-tieu/them")}>
        <Plus color={colors.white} size={24} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginBottom: 16, backgroundColor: colors.tintBlue },
  summaryLabel: { fontSize: 12, color: colors.muted },
  summaryAmount: { fontSize: 28, fontWeight: "800", color: colors.foreground, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { fontWeight: "800", color: colors.brand },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.tintPurple,
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  scanText: { fontWeight: "700", color: colors.brand },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
