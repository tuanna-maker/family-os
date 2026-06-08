import { useMemo, useState } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { appAlert } from "@mobile/utils/alert";

import { useFocusEffect, useRouter } from "expo-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCallback } from "react";

import { Check, Plus, Trash2 } from "lucide-react-native";

import { Screen } from "@mobile/components/Screen";

import { Card, PageHeader } from "@mobile/components/ui";

import { SectionHeader } from "@mobile/components/SectionHeader";

import { LoadingState, EmptyState } from "@mobile/components/states";

import { colors, radius } from "@mobile/theme/colors";

import { useFamilyContext } from "@mobile/hooks/useFamilyContext";

import {

  deleteTrip,

  deleteTripItem,

  getTripBundle,

  listTrips,

  toggleTripItem,

} from "@mobile/api/trips";

import { toast } from "@mobile/utils/toast";

import { useI18n } from "@mobile/i18n/useI18n";

import { formatCurrency, formatDate } from "@mobile/i18n/format";

import { displayTripLabel, displayTripTitle } from "@mobile/utils/displayContent";



type TripBundle = Awaited<ReturnType<typeof getTripBundle>>;



export default function DuLichScreen() {

  const router = useRouter();

  const { familyId } = useFamilyContext();

  const qc = useQueryClient();

  const { locale, s } = useI18n();

  const tr = s.screens.travel;

  const c = s.common;

  const [selectedId, setSelectedId] = useState<string | null>(null);



  const tripsQ = useQuery({

    queryKey: ["family-trips", familyId],

    queryFn: () => listTrips({ family_id: familyId! }),

    enabled: !!familyId,

  });



  const trips = tripsQ.data ?? [];

  const activeId = selectedId ?? trips[0]?.id ?? null;



  const bundleQ = useQuery({

    queryKey: ["trip-bundle", activeId],

    queryFn: () => getTripBundle({ trip_id: activeId! }),

    enabled: !!activeId,

  });



  useFocusEffect(

    useCallback(() => {

      if (!activeId) return;

      qc.invalidateQueries({ queryKey: ["trip-bundle", activeId] });

    }, [activeId, qc]),

  );



  const selected = useMemo(() => trips.find((t) => t.id === activeId), [trips, activeId]);

  const items = bundleQ.data?.items ?? [];

  const checklist = items.filter((i) => i.kind === "checklist");



  const invalidate = () => {

    qc.invalidateQueries({ queryKey: ["family-trips", familyId] });

    if (activeId) qc.invalidateQueries({ queryKey: ["trip-bundle", activeId] });

  };



  const toggleMut = useMutation({

    mutationFn: toggleTripItem,

    onMutate: async ({ id, done }) => {

      if (!activeId) return;

      await qc.cancelQueries({ queryKey: ["trip-bundle", activeId] });

      const prev = qc.getQueryData<TripBundle>(["trip-bundle", activeId]);

      qc.setQueryData<TripBundle>(["trip-bundle", activeId], (old) => {

        if (!old) return old;

        return {

          ...old,

          items: old.items.map((item) => (item.id === id ? { ...item, done } : item)),

        };

      });

      return { prev };

    },

    onError: (e: Error, _vars, ctx) => {

      if (ctx?.prev && activeId) qc.setQueryData(["trip-bundle", activeId], ctx.prev);

      toast.error(e.message);

    },

    onSettled: () => invalidate(),

  });



  const delTripMut = useMutation({

    mutationFn: (id: string) => deleteTrip({ id }),

    onSuccess: () => {

      toast.success(tr.tripDeleted);

      setSelectedId(null);

      invalidate();

    },

    onError: (e: Error) => toast.error(e.message),

  });



  const delItemMut = useMutation({

    mutationFn: (id: string) => deleteTripItem({ id }),

    onSuccess: () => {

      toast.success(tr.itemDeleted);

      invalidate();

    },

    onError: (e: Error) => toast.error(e.message),

  });



  const fmtTripDate = (iso?: string | null) => (iso ? formatDate(iso, locale) : "?");



  return (

    <Screen contentStyle={{ paddingTop: 0 }}>

      <PageHeader eyebrow={c.familyCore} title={tr.familyTitle} back="/(tabs)/gia-dinh" />



      <Pressable style={styles.addTrip} onPress={() => router.push("/du-lich/them")}>

        <Plus color={colors.white} size={18} />

        <Text style={styles.addTripText}>{tr.newTrip}</Text>

      </Pressable>



      {tripsQ.isLoading && <LoadingState />}

      {trips.length === 0 && !tripsQ.isLoading && (

        <EmptyState title={tr.empty} description={tr.createFirst} />

      )}



      {trips.length > 0 && (

        <>

          <View style={styles.tripTabs}>

            {trips.map((t) => (

              <Pressable

                key={t.id}

                onPress={() => setSelectedId(t.id)}

                style={[styles.tripTab, activeId === t.id && styles.tripTabActive]}

              >

                <Text style={[styles.tripTabText, activeId === t.id && styles.tripTabTextActive]} numberOfLines={1}>

                  {displayTripTitle(t.title, locale)}

                </Text>

              </Pressable>

            ))}

          </View>



          {selected && (

            <Card style={{ marginBottom: 12 }}>

              <Text style={styles.tripTitle}>{displayTripTitle(selected.title, locale)}</Text>

              <Text style={styles.muted}>

                {selected.destination ?? "—"} · {tr.status[selected.status as keyof typeof tr.status] ?? selected.status}

              </Text>

              <Text style={styles.muted}>

                {fmtTripDate(selected.start_date)} → {fmtTripDate(selected.end_date)} ·{" "}

                {tr.budgetLabel(formatCurrency(selected.budget_planned, locale))}

              </Text>

              <View style={styles.actions}>

                <Pressable onPress={() => router.push(`/du-lich/${selected.id}`)}>

                  <Text style={styles.link}>{tr.detailsAndItems}</Text>

                </Pressable>

                <Pressable

                  onPress={() =>

                    appAlert(tr.deleteTrip, displayTripTitle(selected.title, locale), [

                      { text: c.cancel, style: "cancel" },

                      { text: c.delete, style: "destructive", onPress: () => delTripMut.mutate(selected.id) },

                    ])

                  }

                >

                  <Trash2 color={colors.emergency} size={16} />

                </Pressable>

              </View>

            </Card>

          )}



          <SectionHeader title={tr.checklistTitle} count={checklist.length} />

          {bundleQ.isLoading ? (

            <LoadingState />

          ) : checklist.length === 0 ? (

            <Text style={styles.muted}>{tr.noChecklistItems}</Text>

          ) : (

            checklist.map((item) => (

              <Card key={item.id} style={styles.checkRow}>

                <Pressable

                  onPress={() => toggleMut.mutate({ id: item.id, done: !item.done })}

                  style={[styles.check, item.done && styles.checkDone]}

                  disabled={toggleMut.isPending}

                >

                  {item.done ? <Check color={colors.success} size={16} /> : null}

                </Pressable>

                <Text style={[styles.checkLabel, item.done && styles.done]}>

                  {displayTripLabel(item.label, locale)}

                </Text>

                <Pressable onPress={() => delItemMut.mutate(item.id)} disabled={delItemMut.isPending}>

                  <Trash2 color={colors.muted} size={14} />

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

  addTrip: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    backgroundColor: colors.brandDeep,

    padding: 14,

    borderRadius: radius.lg,

    marginBottom: 16,

  },

  addTripText: { color: colors.white, fontWeight: "700" },

  tripTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },

  tripTab: {

    paddingHorizontal: 12,

    paddingVertical: 8,

    borderRadius: radius.lg,

    backgroundColor: colors.card,

    borderWidth: 1,

    borderColor: colors.cardBorder,

    maxWidth: "48%",

  },

  tripTabActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },

  tripTabText: { fontWeight: "600", color: colors.foreground },

  tripTabTextActive: { color: colors.white },

  tripTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },

  muted: { fontSize: 12, color: colors.muted, marginTop: 4 },

  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" },

  link: { color: colors.brand, fontWeight: "700" },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },

  check: {

    width: 24,

    height: 24,

    borderRadius: 6,

    borderWidth: 1,

    borderColor: colors.cardBorder,

    alignItems: "center",

    justifyContent: "center",

  },

  checkDone: { borderColor: colors.success, backgroundColor: "rgba(16,185,129,0.12)" },

  checkLabel: { flex: 1, fontWeight: "600", color: colors.foreground },

  done: { textDecorationLine: "line-through", color: colors.muted },

});


