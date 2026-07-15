import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingBag, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { deleteFoodRow, listFood, toggleShopping } from "@mobile/api/food";
import { createFamilyServiceRequest } from "@mobile/api/service-requests";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";

export default function MuaSamHoScreen() {
  const router = useRouter();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const { s } = useI18n();
  const sh = s.screens.shopping;
  const c = s.common;

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const requestMut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: sh.requestTitle,
        description: sh.requestDesc,
        category: "shopping",
        priority: "normal",
      }),
    onSuccess: () => toast.success(c.shoppingSent),
    onError: (e: Error) => toast.error(e.message),
  });

  const tgMut = useMutation({
    mutationFn: toggleShopping,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food", familyId] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFoodRow({ table: "shopping_items", id }),
    onSuccess: () => {
      toast.success(c.deleted);
      qc.invalidateQueries({ queryKey: ["food", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shopping = q.data?.shopping ?? [];
  const pending = shopping.filter((item) => !item.purchased);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow={c.service}
        title={sh.title}
        back="/(tabs)/gia-dinh"
        right={
          <HeaderIconButton
            variant="primary"
            accessibilityLabel={sh.addItemA11y}
            onPress={() => router.push("/mua-sam-ho/them")}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      {(famLoading || q.isLoading) && <LoadingState />}

      {q.data && familyId && (
        <>
          <Card style={styles.banner}>
            <ShoppingBag color={colors.brand} size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{sh.bannerTitle}</Text>
              <Text style={styles.bannerSub}>{sh.bannerSub}</Text>
            </View>
          </Card>
          <PrimaryButton
            label={requestMut.isPending ? c.sendingRequest : c.sendShoppingRequest}
            onPress={() => requestMut.mutate()}
            disabled={pending.length === 0 || requestMut.isPending}
          />

          <SectionHeader
            title={sh.list}
            subtitle={sh.listSub(pending.length, shopping.length)}
            onAction={() => router.push("/mua-sam-ho/them")}
          />

          {shopping.length === 0 ? (
            <EmptyState title={c.noShoppingItems} description={c.noShoppingItemsDesc} />
          ) : (
            shopping.map((item) => (
              <Card key={item.id} style={styles.row}>
                <Pressable onPress={() => tgMut.mutate({ id: item.id, purchased: !item.purchased })} style={styles.check}>
                  <Text>{item.purchased ? "✓" : ""}</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, item.purchased && styles.purchased]}>{item.name}</Text>
                  <Text style={styles.sub}>
                    {[item.qty != null ? `${item.qty}${item.unit ?? ""}` : null, item.category].filter(Boolean).join(" · ") || "—"}
                  </Text>
                </View>
                <Pressable onPress={() => router.push(`/mua-sam-ho/them?id=${item.id}`)}>
                  <Text style={styles.link}>{c.edit}</Text>
                </Pressable>
                <Pressable onPress={() => delMut.mutate(item.id)}>
                  <Trash2 color={colors.emergency} size={16} />
                </Pressable>
              </Card>
            ))
          )}
        </>
      )}
      <View style={{ height: 32 }} />
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
});
