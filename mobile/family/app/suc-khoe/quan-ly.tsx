import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { DateTimeField, toLocalIso } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteHealthRow,
  listHealth,
  upsertAppointment,
  upsertMedicine,
} from "@mobile/api/health";
import { toast } from "@mobile/utils/toast";
import { colors } from "@mobile/theme/colors";

export default function SucKhoeQuanLyScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const [medMember, setMedMember] = useState("");
  const [medName, setMedName] = useState("");
  const [medTime, setMedTime] = useState("08:00");
  const [apptMember, setApptMember] = useState("");
  const [apptDoctor, setApptDoctor] = useState("");
  const [apptAt, setApptAt] = useState(toLocalIso(new Date()));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["health-overview", familyId] });

  const addMed = useMutation({
    mutationFn: () =>
      upsertMedicine({
        family_id: familyId,
        member_name: medMember.trim(),
        medicine: medName.trim(),
        time_of_day: medTime,
        active: true,
      }),
    onSuccess: () => {
      toast.success("Đã thêm nhắc thuốc");
      setMedName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addAppt = useMutation({
    mutationFn: () =>
      upsertAppointment({
        family_id: familyId,
        member_name: apptMember.trim(),
        doctor: apptDoctor.trim() || null,
        scheduled_at: new Date(apptAt).toISOString(),
        status: "scheduled",
      }),
    onSuccess: () => {
      toast.success("Đã thêm lịch khám");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteHealthRow,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Quản lý sức khỏe" back="/suc-khoe" />

      <SectionHeader title="Thêm nhắc thuốc" />
      <TextField label="Thành viên" value={medMember} onChangeText={setMedMember} placeholder="Bé Minh" />
      <TextField label="Tên thuốc" value={medName} onChangeText={setMedName} />
      <TextField label="Giờ uống (HH:MM)" value={medTime} onChangeText={setMedTime} />
      <PrimaryButton
        label="Lưu nhắc thuốc"
        onPress={() => addMed.mutate()}
        disabled={!medMember.trim() || !medName.trim()}
        loading={addMed.isPending}
      />

      <SectionHeader title="Thêm lịch khám" />
      <TextField label="Thành viên" value={apptMember} onChangeText={setApptMember} />
      <TextField label="Bác sĩ / Cơ sở" value={apptDoctor} onChangeText={setApptDoctor} />
      <DateTimeField label="Thời gian" value={apptAt} onChange={setApptAt} />
      <PrimaryButton
        label="Lưu lịch khám"
        onPress={() => addAppt.mutate()}
        disabled={!apptMember.trim()}
        loading={addAppt.isPending}
      />

      <SectionHeader title="Danh sách lịch khám" />
      {(q.data?.appts ?? []).map((a) => (
        <Card key={a.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{a.member_name}</Text>
            <Text style={styles.sub}>
              {new Date(a.scheduled_at).toLocaleString("vi-VN")}
              {a.doctor ? ` · ${a.doctor}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert("Xóa?", a.member_name, [
                { text: "Huỷ", style: "cancel" },
                { text: "Xóa", style: "destructive", onPress: () => delMut.mutate({ table: "medical_appointments", id: a.id }) },
              ])
            }
          >
            <Trash2 color={colors.emergency} size={16} />
          </Pressable>
        </Card>
      ))}

      <SectionHeader title="Danh sách nhắc thuốc" />
      {(q.data?.meds ?? []).map((m) => (
        <Card key={m.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{m.member_name} · {m.medicine}</Text>
            <Text style={styles.sub}>{m.time_of_day?.slice(0, 5)}</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert("Xóa?", m.medicine, [
                { text: "Huỷ", style: "cancel" },
                { text: "Xóa", style: "destructive", onPress: () => delMut.mutate({ table: "medicine_reminders", id: m.id }) },
              ])
            }
          >
            <Trash2 color={colors.emergency} size={16} />
          </Pressable>
        </Card>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  title: { fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 12, color: colors.muted },
});
