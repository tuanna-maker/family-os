import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateField } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listFood, upsertFoodItem, upsertShoppingItem } from "@mobile/api/food";
import { toast } from "@mobile/utils/toast";

const LOCS = [
  { id: "fridge", label: "Tủ lạnh" },
  { id: "freezer", label: "Tủ đông" },
  { id: "pantry", label: "Tủ bếp" },
  { id: "other", label: "Khác" },
];

export default function ThucPhamThemScreen() {
  const styles = useThemedStyles(() => ({
    chips: { flexDirection: "row" as const, gap: 8 },
  }));
  const { type = "food", id } = useLocalSearchParams<{ type?: "food" | "shop"; id?: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [expires, setExpires] = useState("");
  const [location, setLocation] = useState("fridge");

  useEffect(() => {
    if (!id || !q.data) return;
    const row =
      type === "food"
        ? q.data.items.find((i) => i.id === id)
        : q.data.shopping.find((s) => s.id === id);
    if (row) {
      setName(row.name);
      setQty(row.qty != null ? String(row.qty) : "");
      setUnit(row.unit ?? "");
      if ("expires_on" in row && row.expires_on) setExpires(row.expires_on);
    }
  }, [id, q.data, type]);

  const mut = useMutation({
    mutationFn: async () => {
      const base = {
        id,
        family_id: familyId,
        name: name.trim(),
        qty: qty ? Number(qty) : null,
        unit: unit.trim() || null,
      };
      if (type === "shop") {
        return upsertShoppingItem({ ...base, category: null, purchased: false });
      }
      return upsertFoodItem({
        ...base,
        location,
        expires_on: expires || null,
        category: null,
        notes: null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food", familyId] });
      toast.success("Đã lưu");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pageTitle = type === "shop" ? (id ? "Sửa món mua" : "Thêm món mua") : id ? "Sửa món tồn" : "Thêm vào tủ";

  if (q.isLoading && id) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={pageTitle} back="/thuc-pham" />
      <TextField label="Tên món" value={name} onChangeText={setName} />
      <TextField label="Số lượng" value={qty} onChangeText={setQty} keyboardType="numeric" />
      <TextField label="Đơn vị" value={unit} onChangeText={setUnit} placeholder="kg, hộp…" />
      {type === "food" && (
        <>
          <DateField label="Hạn dùng" value={expires} onChange={setExpires} minimumDate={new Date()} />
          <FieldLabel>Vị trí</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.chips}>
              {LOCS.map((l) => (
                <SelectChip key={l.id} label={l.label} active={location === l.id} onPress={() => setLocation(l.id)} />
              ))}
            </View>
          </ScrollView>
        </>
      )}
      <PrimaryButton label="Lưu" onPress={() => mut.mutate()} disabled={!name.trim()} loading={mut.isPending} />
    </Screen>
  );
}
