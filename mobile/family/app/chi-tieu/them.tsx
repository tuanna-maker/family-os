import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateField } from "@mobile/components/DateTimeField";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createExpense, listExpenses, updateExpense } from "@mobile/api/expenses";
import { toast } from "@mobile/utils/toast";

const CATEGORIES = ["Ăn uống", "Nhà cửa", "Con cái", "Sức khỏe", "Giải trí", "Khác"];

export default function ChiTieuThemScreen() {
  const styles = useThemedStyles(() => ({
    chips: { flexDirection: "row" as const, gap: 8 },
  }));
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const isEdit = !!id;

  const listQ = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId && isEdit,
  });

  const existing = listQ.data?.find((r) => r.id === id);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [spentOn, setSpentOn] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setAmount(String(existing.amount));
    setCategory(existing.category);
    setSpentOn(existing.spent_on?.slice(0, 10) ?? spentOn);
  }, [existing]);

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        amount: parseInt(amount, 10) || 0,
        category,
        spent_on: spentOn,
      };
      if (isEdit && id) return updateExpense({ id, ...payload, note: null });
      return createExpense({ family_id: familyId!, ...payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      toast.success(isEdit ? "Đã lưu" : "Đã thêm khoản chi");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Chi tiêu"
        title={isEdit ? "Sửa khoản chi" : "Thêm khoản chi"}
        back="/chi-tieu"
      />
      <TextField label="Tên khoản chi" value={title} onChangeText={setTitle} placeholder="Đi chợ" />
      <TextField label="Số tiền (VND)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <DateField label="Ngày chi" value={spentOn} onChange={setSpentOn} />

      <FieldLabel>Danh mục</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <SelectChip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </ScrollView>

      <PrimaryButton
        label={isEdit ? "Lưu thay đổi" : "Thêm khoản chi"}
        onPress={() => mut.mutate()}
        disabled={!title.trim() || !amount.trim() || (isEdit && listQ.isLoading)}
        loading={mut.isPending}
      />
    </Screen>
  );
}
