import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChefHat, Leaf } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listFood,
  suggestMeals,
  toggleShopping,
  deleteFoodRow,
} from "@mobile/api/food";
import { listCommunityServices } from "@mobile/api/community";
import { ServiceBookingModal } from "@mobile/components/community/ServiceBookingModal";
import { type CommunityServiceItem } from "@mobile/utils/communityService";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";
import { displayFoodName, displayFoodUnit } from "@mobile/utils/displayContent";

export default function ThucPhamScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useFoodStyles();
  const { locale, s } = useI18n();
  const fd = s.screens.food;
  const c = s.common;
  const [bookingService, setBookingService] = useState<CommunityServiceItem | null>(null);

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
  const farmService = (farmQ.data ?? []).find((svc) => svc.slug === "farm");

  type FoodData = Awaited<ReturnType<typeof listFood>>;

  // Giữ nguyên thứ tự danh sách shopping để tick/un-tick không làm UI "nhảy vị trí".
  const shoppingOrderRef = useRef<string[] | null>(null);
  useEffect(() => {
    const list = q.data?.shopping;
    if (!list) return;
    if (!shoppingOrderRef.current) shoppingOrderRef.current = list.map((i) => i.id);
  }, [q.data?.shopping]);

  const shopping = useMemo(() => {
    const list = q.data?.shopping ?? [];
    const order = shoppingOrderRef.current;
    if (!order) return list;
    const idx = new Map(order.map((id, i) => [id, i]));
    return list
      .slice()
      .sort((a, b) => (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9));
  }, [q.data?.shopping]);

  const tgMut = useMutation({
    mutationFn: toggleShopping,
    onMutate: async ({ id, purchased }) => {
      if (!familyId) return;
      await qc.cancelQueries({ queryKey: ["food", familyId] });
      const prev = qc.getQueryData<FoodData>(["food", familyId]);
      qc.setQueryData<FoodData>(["food", familyId], (old) => {
        if (!old) return old;
        return {
          ...old,
          shopping: old.shopping.map((item) => (item.id === id ? { ...item, purchased } : item)),
        };
      });
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev && familyId) qc.setQueryData(["food", familyId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      if (familyId) void qc.invalidateQueries({ queryKey: ["food", familyId] });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteFoodRow,
    onSuccess: () => {
      toast.success(c.deleted);
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
      <PageHeader eyebrow={c.familyCore} title={fd.title} back="/(tabs)/gia-dinh" />

      {farmService && (
        <Card style={styles.farmCard}>
          <Leaf color={colors.success} size={22} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>{fd.farmFresh}</Text>
            <Text style={styles.sub}>{fd.farmSub}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.farmBookBtn,
              !familyId && styles.farmBookBtnDisabled,
              pressed && familyId && { opacity: 0.9 },
            ]}
            disabled={!familyId}
            onPress={() => {
              if (!familyId) {
                toast.error(c.noFamily);
                return;
              }
              setBookingService(farmService as CommunityServiceItem);
            }}
          >
            <Text style={styles.farmBookBtnText}>{fd.book}</Text>
          </Pressable>
        </Card>
      )}

      {(expired.length > 0 || expiringSoon.length > 0) && (
        <Card style={styles.alert}>
          <Text style={styles.alertText}>
            {expired.length > 0 ? fd.expiredCount(expired.length) : ""}
            {expiringSoon.length > 0 ? fd.expiringCount(expiringSoon.length) : ""}
          </Text>
        </Card>
      )}

      <SectionHeader
        title={fd.inventory}
        subtitle={fd.itemCount(q.data?.items.length ?? 0)}
        onAction={() => router.push({ pathname: "/thuc-pham/them", params: { type: "food" } })}
      />
      {(q.data?.items ?? []).length === 0 ? (
        <Card style={styles.emptyCard}><Text style={styles.sub}>{fd.noItems}</Text></Card>
      ) : (
        (q.data?.items ?? []).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push({ pathname: "/thuc-pham/them", params: { type: "food", id: item.id } })}
            onLongPress={() =>
              appAlert(`${c.delete}?`, item.name, [
                { text: c.cancel, style: "cancel" },
                {
                  text: c.delete,
                  style: "destructive",
                  onPress: () => delMut.mutate({ table: "food_items", id: item.id }),
                },
              ])
            }
          >
            <Card style={styles.row}>
              <Text style={styles.title}>{displayFoodName(item.name, locale)}</Text>
              <Text style={styles.sub}>
                {item.expires_on ? fd.expiryLabel(formatDate(item.expires_on, locale)) : fd.noExpiry}
                {item.qty != null
                  ? ` · ${item.qty}${item.unit ? ` ${displayFoodUnit(item.unit, locale)}` : ""}`
                  : ""}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <SectionHeader
        title={fd.shopping}
        count={shopping.length}
        onAction={() => router.push({ pathname: "/thuc-pham/them", params: { type: "shop" } })}
      />
      {shopping.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.sub}>{fd.noShopping}</Text>
        </Card>
      ) : (
        shopping.map((item) => (
          <Card key={item.id} style={styles.shopRow}>
            <Pressable
              style={[styles.check, item.purchased && styles.checkOn]}
              onPress={() => tgMut.mutate({ id: item.id, purchased: !item.purchased })}
              hitSlop={6}
            >
              {item.purchased ? <Check color={colors.white} size={16} strokeWidth={3} /> : null}
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: "/thuc-pham/them", params: { type: "shop", id: item.id } })}
            >
              <Text style={[styles.title, item.purchased && styles.done]}>{displayFoodName(item.name, locale)}</Text>
              <Text style={styles.sub}>
                {[item.qty && `${item.qty}${item.unit ?? ""}`, item.category].filter(Boolean).join(" · ") || "—"}
              </Text>
            </Pressable>
          </Card>
        ))
      )}

      <SectionHeader title={fd.mealSuggestions} />
      {(mealsQ.data?.suggestions ?? []).map((item, i) => (
        <Card key={i} style={styles.row}>
          <ChefHat color={colors.brand} size={18} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.reason} · {item.time}</Text>
          </View>
        </Card>
      ))}

      <ServiceBookingModal
        service={bookingService}
        familyId={familyId}
        onClose={() => setBookingService(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["service-bookings"] })}
      />

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useFoodStyles() {
  return useThemedStyles((colors, fontScale) => ({
    farmCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      marginBottom: 12,
    },
    farmBookBtn: {
      flexShrink: 0,
      minWidth: 64,
      height: 40,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    farmBookBtnDisabled: { opacity: 0.45 },
    farmBookBtnText: {
      color: colors.white,
      fontSize: 14 * fontScale,
      fontWeight: "700" as const,
      lineHeight: 18,
    },
    alert: { backgroundColor: colors.tintOrange, marginBottom: 12 },
    alertText: { color: colors.foreground, fontWeight: "600" as const, fontSize: 13 * fontScale },
    row: { marginBottom: 10, gap: 4, ...cardShadow(colors) },
    shopRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 8 },
    check: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    checkOn: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    title: { fontWeight: "700" as const, color: colors.foreground, fontSize: 16 * fontScale },
    sub: { fontSize: 12 * fontScale, color: colors.muted, lineHeight: 18 },
    done: { textDecorationLine: "line-through" as const, color: colors.muted },
    emptyCard: { marginBottom: 10 },
  }));
}
