import { useMemo } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Leaf, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listFood,
  suggestMeals,
  toggleShopping,
  deleteFoodRow,
} from "@mobile/api/food";
import { listCommunityServices, createServiceBooking } from "@mobile/api/community";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function ThucPhamScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useFoodStyles();

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const mealsQ = useQuery({
    queryKey: ["meal-suggest", familyId],
    queryFn: () => suggestMeals({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const farmQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });
  const farmService = (farmQ.data ?? []).find((s) => s.slug === "farm");

  const farmBook = useMutation({
    mutationFn: () => createServiceBooking({ service_id: farmService!.id, family_id: familyId! }),
    onSuccess: () => toast.success("Đã đặt Farm Fresh — BQL sẽ liên hệ"),
    onError: (e: Error) => toast.error(e.message),
  });

  const tgMut = useMutation({
    mutationFn: toggleShopping,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food", familyId] }),
  });

  const delMut = useMutation({
    mutationFn: deleteFoodRow,
    onSuccess: () => {
      toast.success("Đã xóa");
      qc.invalidateQueries({ queryKey: ["food", familyId] });
      qc.invalidateQueries({ queryKey: ["meal-suggest", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { expiringSoon, expired } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonLimit = new Date(today);
    soonLimit.setDate(soonLimit.getDate() + 3);
    const soon: Array<{ id: string; name: string; expires_on: string | null }> = [];
    const exp: typeof soon = [];
    (q.data?.items ?? []).forEach((it) => {
      if (!it.expires_on) return;
      const d = new Date(it.expires_on);
      if (d < today) exp.push(it);
      else if (d <= soonLimit) soon.push(it);
    });
    return { expiringSoon: soon, expired: exp };
  }, [q.data]);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Thực phẩm & Tủ lạnh" back="/(tabs)/gia-dinh" />

      {farmService && (
        <Card style={styles.farmCard}>
          <Leaf color={colors.success} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Farm Fresh</Text>
            <Text style={styles.sub}>Đặt rau củ tươi giao tận căn hộ</Text>
          </View>
          <PrimaryButton label="Đặt" onPress={() => farmBook.mutate()} loading={farmBook.isPending} />
        </Card>
      )}

      {(expired.length > 0 || expiringSoon.length > 0) && (
        <Card style={styles.alert}>
          <Text style={styles.alertText}>
            {expired.length > 0 ? `${expired.length} món đã hết hạn. ` : ""}
            {expiringSoon.length > 0 ? `${expiringSoon.length} món sắp hết hạn (≤3 ngày).` : ""}
          </Text>
        </Card>
      )}

      <SectionHeader
        title="Tồn kho"
        subtitle={`${q.data?.items.length ?? 0} món`}
        onAction={() => router.push({ pathname: "/thuc-pham/them", params: { type: "food" } })}
      />
      {(q.data?.items ?? []).length === 0 ? (
        <Card><Text style={styles.sub}>Chưa có thực phẩm.</Text></Card>
      ) : (
        (q.data?.items ?? []).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push({ pathname: "/thuc-pham/them", params: { type: "food", id: item.id } })}
            onLongPress={() =>
              Alert.alert("Xóa?", item.name, [
                { text: "Huỷ", style: "cancel" },
                {
                  text: "Xóa",
                  style: "destructive",
                  onPress: () => delMut.mutate({ table: "food_items", id: item.id }),
                },
              ])
            }
          >
            <Card style={styles.row}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.expires_on ? `HSD: ${item.expires_on}` : "Không HSD"}
                {item.qty != null ? ` · ${item.qty}${item.unit ? ` ${item.unit}` : ""}` : ""}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <SectionHeader
        title="Đi chợ"
        subtitle={`${(q.data?.shopping ?? []).filter((s) => !s.purchased).length} chưa mua`}
        onAction={() => router.push({ pathname: "/thuc-pham/them", params: { type: "shop" } })}
      />
      {(q.data?.shopping ?? []).length === 0 ? (
        <Card><Text style={styles.sub}>Chưa có món cần mua.</Text></Card>
      ) : (
        (q.data?.shopping ?? []).map((s) => (
          <Card key={s.id} style={styles.shopRow}>
            <Pressable
              style={[styles.check, s.purchased && styles.checkOn]}
              onPress={() => tgMut.mutate({ id: s.id, purchased: !s.purchased })}
            />
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: "/thuc-pham/them", params: { type: "shop", id: s.id } })}
            >
              <Text style={[styles.title, s.purchased && styles.done]}>{s.name}</Text>
              <Text style={styles.sub}>
                {[s.qty && `${s.qty}${s.unit ?? ""}`, s.category].filter(Boolean).join(" · ") || "—"}
              </Text>
            </Pressable>
          </Card>
        ))
      )}

      <SectionHeader title="Gợi ý bữa ăn" />
      {(mealsQ.data?.suggestions ?? []).map((s, i) => (
        <Card key={i} style={styles.row}>
          <ChefHat color={colors.brand} size={18} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.sub}>{s.reason} · {s.time}</Text>
          </View>
        </Card>
      ))}

      <Pressable style={styles.fab} onPress={() => router.push({ pathname: "/thuc-pham/them", params: { type: "food" } })}>
        <Plus color={colors.white} size={24} />
      </Pressable>
      <View style={{ height: 48 }} />
    </Screen>
  );
}

function useFoodStyles() {
  return useThemedStyles((colors, fontScale) => ({
    farmCard: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 12 },
    alert: { backgroundColor: colors.tintOrange, marginBottom: 12 },
    alertText: { color: colors.foreground, fontWeight: "600" as const, fontSize: 13 * fontScale },
    row: { marginBottom: 10, gap: 4 },
    shopRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 8 },
    check: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBorder,
    },
    checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    title: { fontWeight: "700" as const, color: colors.foreground, fontSize: 16 * fontScale },
    sub: { fontSize: 12 * fontScale, color: colors.muted },
    done: { textDecorationLine: "line-through" as const, color: colors.muted },
    fab: {
      position: "absolute" as const,
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.brandDeep,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }));
}
