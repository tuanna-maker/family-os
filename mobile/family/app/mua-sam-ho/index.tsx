import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingBag, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { deleteFoodRow, listFood, toggleShopping } from "@mobile/api/food";
import { createFamilyServiceRequest } from "@mobile/api/service-requests";
import { toast } from "@mobile/utils/toast";

export default function MuaSamHoScreen() {
  const router = useRouter();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const requestMut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: "Yêu cầu mua sắm hộ",
        description: "Gia đình cần hỗ trợ mua hộ theo danh sách trong app.",
        category: "shopping",
        priority: "normal",
      }),
    onSuccess: () => toast.success("Đã gửi yêu cầu mua hộ"),
    onError: (e: Error) => toast.error(e.message),
  });

  const tgMut = useMutation({
    mutationFn: toggleShopping,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food", familyId] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFoodRow({ table: "shopping_items", id }),
    onSuccess: () => {
      toast.success("Đã xoá");
      qc.invalidateQueries({ queryKey: ["food", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shopping = q.data?.shopping ?? [];
  const pending = shopping.filter((s) => !s.purchased);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Dịch vụ" title="Mua sắm hộ" back="/(tabs)/gia-dinh" />

      {(famLoading || q.isLoading) && <LoadingState />}

      {q.data && familyId && (
        <>
          <Card style={styles.banner}>
            <ShoppingBag color={colors.brand} size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Đặt người mua hộ</Text>
              <Text style={styles.bannerSub}>Gửi yêu cầu tới Ban quản lý theo danh sách bên dưới.</Text>
            </View>
          </Card>
          <PrimaryButton
            label={requestMut.isPending ? "Đang gửi…" : "Gửi yêu cầu mua hộ"}
            onPress={() => requestMut.mutate()}
            disabled={pending.length === 0 || requestMut.isPending}
          />

          <SectionHeader
            title="Danh sách cần mua"
            subtitle={`${pending.length} chưa mua · ${shopping.length} tổng`}
            onAction={() => router.push("/mua-sam-ho/them")}
          />

          {shopping.length === 0 ? (
            <EmptyState title="Chưa có món cần mua" description="Thêm món để lập danh sách đi chợ" />
          ) : (
            shopping.map((s) => (
              <Card key={s.id} style={styles.row}>
                <Pressable onPress={() => tgMut.mutate({ id: s.id, purchased: !s.purchased })} style={styles.check}>
                  <Text>{s.purchased ? "✓" : ""}</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, s.purchased && styles.purchased]}>{s.name}</Text>
                  <Text style={styles.sub}>
                    {[s.qty != null ? `${s.qty}${s.unit ?? ""}` : null, s.category].filter(Boolean).join(" · ") || "—"}
                  </Text>
                </View>
                <Pressable onPress={() => router.push(`/mua-sam-ho/them?id=${s.id}`)}>
                  <Text style={styles.link}>Sửa</Text>
                </Pressable>
                <Pressable onPress={() => delMut.mutate(s.id)}>
                  <Trash2 color={colors.emergency} size={16} />
                </Pressable>
              </Card>
            ))
          )}

          <Pressable style={styles.fab} onPress={() => router.push("/mua-sam-ho/them")}>
            <Plus color={colors.white} size={22} />
          </Pressable>
        </>
      )}
      <View style={{ height: 48 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 12, backgroundColor: colors.tintPurple },
  bannerTitle: { fontWeight: "700", color: colors.foreground },
  bannerSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { fontWeight: "700", color: colors.foreground },
  purchased: { textDecorationLine: "line-through", color: colors.muted },
  sub: { fontSize: 11, color: colors.muted },
  link: { color: colors.brand, fontWeight: "600", fontSize: 12 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
