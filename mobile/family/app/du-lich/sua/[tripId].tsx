import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { DateField } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getTripBundle, upsertTrip } from "@mobile/api/trips";
import { toast } from "@mobile/utils/toast";
import { colors } from "@mobile/theme/colors";
import { Text } from "react-native";
import { useI18n } from "@mobile/i18n/useI18n";

export default function DuLichSuaScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { s } = useI18n();
  const tr = s.screens.travel;
  const c = s.common;

  const q = useQuery({
    queryKey: ["trip-bundle", tripId],
    queryFn: () => getTripBundle({ trip_id: tripId! }),
    enabled: !!tripId,
  });

  const trip = q.data?.trip;

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [members, setMembers] = useState("2");
  const [budget, setBudget] = useState("0");

  useEffect(() => {
    if (!trip) return;
    setTitle(trip.title);
    setDestination(trip.destination ?? "");
    setStartDate(trip.start_date ?? "");
    setEndDate(trip.end_date ?? "");
    setMembers(String(trip.members_count ?? 2));
    setBudget(String(trip.budget_planned ?? 0));
  }, [trip]);

  const mut = useMutation({
    mutationFn: () =>
      upsertTrip({
        id: tripId,
        family_id: familyId!,
        title: title.trim(),
        destination: destination.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        members_count: Number(members) || 1,
        budget_planned: Number(budget) || 0,
        status: trip?.status ?? "planning",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-trips"] });
      qc.invalidateQueries({ queryKey: ["trip-bundle", tripId] });
      toast.success(tr.tripSaved);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Screen><LoadingState /></Screen>;
  if (!trip) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={tr.edit} back="/du-lich" />
        <Text style={{ color: colors.muted }}>{tr.tripNotFound}</Text>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={tr.eyebrow} title={tr.edit} back={`/du-lich/${tripId}`} />
      <TextField label={tr.tripName} value={title} onChangeText={setTitle} />
      <TextField label={tr.destination} value={destination} onChangeText={setDestination} />
      <DateField label={tr.startDate} value={startDate} onChange={setStartDate} />
      <DateField label={tr.endDate} value={endDate} onChange={setEndDate} minimumDate={startDate ? new Date(`${startDate}T12:00:00`) : undefined} />
      <TextField label={tr.membersCount} value={members} onChangeText={setMembers} keyboardType="numeric" />
      <TextField label={tr.budgetVnd} value={budget} onChangeText={setBudget} keyboardType="numeric" />
      <View style={{ marginTop: 8 }}>
        <PrimaryButton label={c.save} onPress={() => mut.mutate()} disabled={!title.trim()} loading={mut.isPending} />
      </View>
    </Screen>
  );
}
