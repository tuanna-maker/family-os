import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { AmountInput } from "@mobile/components/expense/AmountInput";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateField } from "@mobile/components/DateTimeField";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useTheme } from "@mobile/theme/themeStore";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import { createExpense, listExpenses, updateExpense } from "@mobile/api/expenses";
import { getCategoryLabel } from "@mobile/components/family/CategoryMeta";
import { formatAmountDigits, parseAmountDigits } from "@mobile/lib/amount-input";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";

export default function ChiTieuThemScreen() {
  const styles = useThemedStyles(() => ({
    chips: { flexDirection: "row" as const, gap: 8 },
    amountWrap: { marginBottom: 12 },
  }));
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { locale, s } = useI18n();
  const ex = s.expense;
  const c = s.common;
  const { familyId } = useFamilyContext();
  const { settings } = useExpenseSettings(familyId);
  const qc = useQueryClient();
  const isEdit = !!id;

  const categoryKeys = settings?.categories.map((cat) => cat.key) ?? ["dining"];

  const listQ = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId && isEdit,
  });

  const existing = listQ.data?.find((r) => r.id === id);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categoryKeys[0] ?? "dining");
  const [spentOn, setSpentOn] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (categoryKeys.length && !categoryKeys.includes(category)) {
      setCategory(categoryKeys[0]);
    }
  }, [categoryKeys.join(",")]);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setAmount(formatAmountDigits(Number(existing.amount), locale));
    setCategory(existing.category);
    setSpentOn(existing.spent_on?.slice(0, 10) ?? spentOn);
  }, [existing, locale]);

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        amount: parseAmountDigits(amount),
        category,
        spent_on: spentOn,
      };
      if (isEdit && id) return updateExpense({ id, ...payload, note: null });
      return createExpense({ family_id: familyId!, ...payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      toast.success(isEdit ? c.saved : ex.addedExpense);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow={ex.scanEyebrow}
        title={isEdit ? ex.editExpense : ex.addExpenseItem}
        back="/chi-tieu"
        right={
          <Pressable
            onPress={() => router.push("/chi-tieu/cai-dat-danh-muc" as never)}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <SlidersHorizontal size={22} color={colors.brand} />
          </Pressable>
        }
      />
      <TextField label={ex.expenseName} value={title} onChangeText={setTitle} placeholder="Đi chợ" />
      <FieldLabel>{ex.amountVnd}</FieldLabel>
      <View style={styles.amountWrap}>
        <AmountInput value={amount} onChangeValue={setAmount} placeholder="0" fullWidth />
      </View>
      <DateField label={ex.spentDate} value={spentOn} onChange={setSpentOn} />

      <FieldLabel>{ex.category}</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {categoryKeys.map((key) => (
            <SelectChip
              key={key}
              label={getCategoryLabel(key, locale, settings?.categories)}
              active={category === key}
              onPress={() => setCategory(key)}
            />
          ))}
        </View>
      </ScrollView>

      <PrimaryButton
        label={isEdit ? ex.saveChanges : ex.addExpenseItem}
        onPress={() => mut.mutate()}
        disabled={!title.trim() || !parseAmountDigits(amount) || (isEdit && listQ.isLoading)}
        loading={mut.isPending}
      />
    </Screen>
  );
}
