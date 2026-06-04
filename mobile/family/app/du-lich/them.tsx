import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { DateField } from "@mobile/components/DateTimeField";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { upsertTrip } from "@mobile/api/trips";
import { toast } from "@mobile/utils/toast";

export default function DuLichThemScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [members, setMembers] = useState("2");
  const [budget, setBudget] = useState("0");

  const mut = useMutation({
    mutationFn: () =>
      upsertTrip({
        family_id: familyId!,
        title: title.trim(),
        destination: destination.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        members_count: Number(members) || 1,
        budget_planned: Number(budget) || 0,
        status: "planning",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-trips"] });
      toast.success("Đã tạo chuyến đi");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Du lịch" title="Chuyến đi mới" back="/du-lich" />
      <TextField label="Tên chuyến đi" value={title} onChangeText={setTitle} placeholder="Phú Quốc hè 2026" />
      <TextField label="Điểm đến" value={destination} onChangeText={setDestination} />
      <DateField label="Ngày đi" value={startDate} onChange={setStartDate} />
      <DateField label="Ngày về" value={endDate} onChange={setEndDate} minimumDate={startDate ? new Date(`${startDate}T12:00:00`) : undefined} />
      <TextField label="Số người" value={members} onChangeText={setMembers} keyboardType="numeric" />
      <TextField label="Ngân sách (VND)" value={budget} onChangeText={setBudget} keyboardType="numeric" />
      <View style={{ marginTop: 8 }}>
        <PrimaryButton label="Tạo chuyến đi" onPress={() => mut.mutate()} disabled={!title.trim()} loading={mut.isPending} />
      </View>
    </Screen>
  );
}
