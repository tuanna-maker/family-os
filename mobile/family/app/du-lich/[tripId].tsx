import { useState } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { appAlert } from "@mobile/utils/alert";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Pencil, Trash2 } from "lucide-react-native";

import { Screen } from "@mobile/components/Screen";

import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";

import { SectionHeader } from "@mobile/components/SectionHeader";

import { LoadingState } from "@mobile/components/states";

import { colors } from "@mobile/theme/colors";

import { deleteTripItem, getTripBundle, upsertTripItem } from "@mobile/api/trips";

import { toast } from "@mobile/utils/toast";

import { useI18n } from "@mobile/i18n/useI18n";

import { formatDate } from "@mobile/i18n/format";

import { displayTripLabel, displayTripTitle } from "@mobile/utils/displayContent";



export default function DuLichDetailScreen() {

  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const router = useRouter();

  const qc = useQueryClient();

  const { locale, s } = useI18n();

  const tr = s.screens.travel;

  const c = s.common;

  const [newLabel, setNewLabel] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editLabel, setEditLabel] = useState("");



  const q = useQuery({

    queryKey: ["trip-bundle", tripId],

    queryFn: () => getTripBundle({ trip_id: tripId! }),

    enabled: !!tripId,

  });



  const invalidate = () => {

    qc.invalidateQueries({ queryKey: ["trip-bundle", tripId] });

    qc.invalidateQueries({ queryKey: ["trip-bundle"] });

    qc.invalidateQueries({ queryKey: ["family-trips"] });

  };



  const addItem = useMutation({

    mutationFn: () =>

      upsertTripItem({

        trip_id: tripId,

        kind: "checklist",

        label: newLabel.trim(),

      }),

    onSuccess: () => {

      setNewLabel("");

      invalidate();

      toast.success(tr.itemAdded);

    },

    onError: (e: Error) => toast.error(e.message),

  });



  const updateItem = useMutation({

    mutationFn: (vars: { id: string; label: string }) =>

      upsertTripItem({

        id: vars.id,

        trip_id: tripId!,

        kind: "checklist",

        label: vars.label,

      }),

    onSuccess: () => {

      setEditingId(null);

      setEditLabel("");

      invalidate();

      toast.success(tr.itemUpdated);

    },

    onError: (e: Error) => toast.error(e.message),

  });



  const delItem = useMutation({

    mutationFn: (id: string) => deleteTripItem({ id }),

    onSuccess: () => {

      invalidate();

      toast.success(tr.itemDeleted);

    },

    onError: (e: Error) => toast.error(e.message),

  });



  if (q.isLoading) return <Screen><LoadingState /></Screen>;

  const trip = q.data?.trip;

  const checklist = (q.data?.items ?? []).filter((i) => i.kind === "checklist");



  const fmtTripDate = (iso?: string | null) => (iso ? formatDate(iso, locale) : "—");



  const startEdit = (id: string, label: string) => {

    setEditingId(id);

    setEditLabel(label);

  };



  const confirmDelete = (id: string, label: string) => {

    appAlert(c.deleteQuestion, displayTripLabel(label, locale), [

      { text: c.cancel, style: "cancel" },

      { text: c.delete, style: "destructive", onPress: () => delItem.mutate(id) },

    ]);

  };



  return (

    <Screen contentStyle={{ paddingTop: 0 }}>

      <PageHeader

        title={displayTripTitle(trip?.title ?? tr.defaultTripTitle, locale)}

        back="/du-lich"

      />



      <Pressable style={styles.editLink} onPress={() => router.push(`/du-lich/sua/${tripId}`)}>

        <Pencil color={colors.brand} size={16} />

        <Text style={styles.editText}>{tr.editTripInfo}</Text>

      </Pressable>



      <Card style={{ marginBottom: 16 }}>

        <Text style={styles.dest}>{trip?.destination ?? "—"}</Text>

        <Text style={styles.meta}>

          {fmtTripDate(trip?.start_date)} → {fmtTripDate(trip?.end_date)}

        </Text>

      </Card>



      <SectionHeader title={tr.addChecklist} />

      <TextField label={tr.checklistContent} value={newLabel} onChangeText={setNewLabel} placeholder={tr.checklistPh} />

      <PrimaryButton label={c.add} onPress={() => addItem.mutate()} disabled={!newLabel.trim()} loading={addItem.isPending} />



      <SectionHeader title={tr.listTitle} count={checklist.length} />

      {checklist.length === 0 ? (

        <Text style={styles.muted}>{tr.noChecklistItems}</Text>

      ) : (

        checklist.map((item) => (

          <Card key={item.id} style={styles.row}>

            {editingId === item.id ? (

              <View style={{ flex: 1, gap: 8 }}>

                <TextField

                  label={tr.editChecklistItem}

                  value={editLabel}

                  onChangeText={setEditLabel}

                  placeholder={tr.checklistPh}

                />

                <View style={styles.editActions}>

                  <PrimaryButton

                    label={c.save}

                    onPress={() => updateItem.mutate({ id: item.id, label: editLabel.trim() })}

                    disabled={!editLabel.trim()}

                    loading={updateItem.isPending}

                  />

                  <Pressable onPress={() => setEditingId(null)} style={styles.cancelBtn}>

                    <Text style={styles.cancelText}>{c.cancel}</Text>

                  </Pressable>

                </View>

              </View>

            ) : (

              <>

                <View style={{ flex: 1 }}>

                  <Text style={styles.label}>{displayTripLabel(item.label, locale)}</Text>

                  {item.assignee ? <Text style={styles.assignee}>{item.assignee}</Text> : null}

                </View>

                <Pressable onPress={() => startEdit(item.id, item.label)} hitSlop={8}>

                  <Pencil color={colors.brand} size={16} />

                </Pressable>

                <Pressable onPress={() => confirmDelete(item.id, item.label)} hitSlop={8} disabled={delItem.isPending}>

                  <Trash2 color={colors.muted} size={16} />

                </Pressable>

              </>

            )}

          </Card>

        ))

      )}

      <View style={{ height: 32 }} />

    </Screen>

  );

}



const styles = StyleSheet.create({

  editLink: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },

  editText: { color: colors.brand, fontWeight: "700" },

  dest: { fontSize: 16, fontWeight: "700", color: colors.foreground },

  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },

  muted: { fontSize: 12, color: colors.muted, marginBottom: 12 },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },

  label: { fontWeight: "600", color: colors.foreground },

  assignee: { fontSize: 11, color: colors.muted, marginTop: 2 },

  editActions: { gap: 8 },

  cancelBtn: { alignItems: "center", paddingVertical: 8 },

  cancelText: { color: colors.muted, fontWeight: "600" },

});


