import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listFood, upsertShoppingItem } from "@mobile/api/food";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";

export default function MuaSamHoThemScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { s } = useI18n();
  const sh = s.screens.shopping;
  const fd = s.screens.food.form;
  const c = s.common;

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const existing = id ? q.data?.shopping.find((item) => item.id === id) : null;

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setQty(existing.qty != null ? String(existing.qty) : "");
    setUnit(existing.unit ?? "");
    setCategory(existing.category ?? "");
  }, [existing?.id]);

  const mut = useMutation({
    mutationFn: () =>
      upsertShoppingItem({
        id,
        family_id: familyId,
        name: name.trim(),
        qty: qty ? Number(qty) : null,
        unit: unit.trim() || null,
        category: category.trim() || null,
        purchased: existing?.purchased ?? false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food", familyId] });
      toast.success(c.saved);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading && id) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={id ? sh.editShort : sh.addShort} back="/mua-sam-ho" />
      <TextField label={fd.itemName} value={name} onChangeText={setName} placeholder="Sữa tươi" />
      <TextField label={fd.qty} value={qty} onChangeText={setQty} keyboardType="numeric" />
      <TextField label={fd.unit} value={unit} onChangeText={setUnit} placeholder="hộp" />
      <TextField label={sh.itemType} value={category} onChangeText={setCategory} placeholder="Đồ uống" />
      <View style={{ marginTop: 8 }}>
        <PrimaryButton label={c.save} onPress={() => mut.mutate()} disabled={!name.trim()} loading={mut.isPending} />
      </View>
    </Screen>
  );
}
