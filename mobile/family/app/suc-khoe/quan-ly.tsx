import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Stethoscope, Trash2, UserCircle2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { DateTimeField, toLocalIso } from "@mobile/components/DateTimeField";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  deleteHealthRow,
  listHealth,
  upsertAppointment,
  upsertHealthProfile,
  upsertMedicine,
} from "@mobile/api/health";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

const PILOT_PROFILES = [
  { name: "Anh Hùng", blood_type: "O+", dob: null, allergies: null, conditions: null },
  { name: "Chị Lan", blood_type: "A+", dob: null, allergies: "Hải sản", conditions: null },
  { name: "Bé Minh", blood_type: "O+", dob: null, allergies: null, conditions: null },
  { name: "Bà Ngoại", blood_type: "B+", dob: null, allergies: null, conditions: "Cao huyết áp" },
];

export default function SucKhoeQuanLyScreen() {
  const { colors } = useTheme();
  const styles = useQuanLyStyles();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const [profileName, setProfileName] = useState("");
  const [profileBlood, setProfileBlood] = useState("");
  const [medMember, setMedMember] = useState("");
  const [medName, setMedName] = useState("");
  const [medTime, setMedTime] = useState("08:00");
  const [apptMember, setApptMember] = useState("");
  const [apptDoctor, setApptDoctor] = useState("");
  const [apptAt, setApptAt] = useState(toLocalIso(new Date()));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["health-overview", familyId] });

  const addProfile = useMutation({
    mutationFn: () =>
      upsertHealthProfile({
        family_id: familyId,
        name: profileName.trim(),
        blood_type: profileBlood.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Đã thêm hồ sơ");
      setProfileName("");
      setProfileBlood("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        status: "planned",
      }),
    onSuccess: () => {
      toast.success("Đã thêm lịch khám");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteHealthRow,
    onSuccess: () => {
      toast.success("Đã xóa");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const profiles = q.data?.profiles ?? [];
  const meds = q.data?.meds ?? [];
  const appts = q.data?.appts ?? [];
  const showPilotProfiles = profiles.length === 0;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Family Core"
        title="Quản lý sức khỏe"
        subtitle="Hồ sơ, nhắc thuốc, lịch khám"
        back="/suc-khoe"
      />

      <SectionHeader title="Hồ sơ sức khỏe" subtitle={`${profiles.length} thành viên`} />
      {showPilotProfiles ? (
        <>
          {PILOT_PROFILES.map((p) => (
            <Card key={p.name} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.tintBlue }]}>
                <UserCircle2 color={colors.brand} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.sub}>
                  {[p.blood_type && `Nhóm máu ${p.blood_type}`].filter(Boolean).join(" · ") || "—"}
                </Text>
                {p.allergies ? <Text style={styles.sub}>⚠️ Dị ứng: {p.allergies}</Text> : null}
                {p.conditions ? <Text style={styles.sub}>📋 {p.conditions}</Text> : null}
              </View>
            </Card>
          ))}
          <Text style={styles.pilotHint}>Mẫu — thêm hồ sơ thật bên dưới</Text>
        </>
      ) : profiles.length === 0 ? (
        <EmptyState title="Chưa có hồ sơ" description="Thêm hồ sơ cho từng thành viên" />
      ) : (
        profiles.map((p) => (
          <Card key={p.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tintBlue }]}>
              <UserCircle2 color={colors.brand} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{p.name}</Text>
              <Text style={styles.sub}>
                {[p.blood_type && `Nhóm máu ${p.blood_type}`, p.dob && `Sinh ${p.dob}`].filter(Boolean).join(" · ") || "—"}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert("Xóa hồ sơ?", p.name, [
                  { text: "Huỷ", style: "cancel" },
                  { text: "Xóa", style: "destructive", onPress: () => delMut.mutate({ table: "health_profiles", id: p.id }) },
                ])
              }
            >
              <Trash2 color={colors.muted} size={16} />
            </Pressable>
          </Card>
        ))
      )}

      <SectionHeader title="Thêm hồ sơ" />
      <TextField label="Tên thành viên" value={profileName} onChangeText={setProfileName} placeholder="Chị Lan" />
      <TextField label="Nhóm máu" value={profileBlood} onChangeText={setProfileBlood} placeholder="A+" />
      <PrimaryButton
        label="Lưu hồ sơ"
        onPress={() => addProfile.mutate()}
        disabled={!profileName.trim()}
        loading={addProfile.isPending}
      />

      <SectionHeader title="Nhắc uống thuốc" subtitle={`${meds.filter((m) => m.active).length} đang dùng`} />
      {meds.length === 0 ? (
        <EmptyState title="Chưa có lời nhắc" description="Thêm nhắc thuốc bên dưới" />
      ) : (
        meds.map((m) => (
          <Card key={m.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tintPurple }]}>
              <Pill color={colors.pink} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {m.member_name} · {m.medicine}
              </Text>
              <Text style={styles.sub}>{m.time_of_day?.slice(0, 5) ?? "Hàng ngày"}</Text>
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
        ))
      )}

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

      <SectionHeader title="Lịch khám" subtitle={`${appts.length} mục`} />
      {appts.length === 0 ? (
        <EmptyState title="Chưa có lịch khám" description="Thêm lịch khám bên dưới" />
      ) : (
        appts.map((a) => (
          <Card key={a.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tintGreen }]}>
              <Stethoscope color={colors.success} size={16} />
            </View>
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
        ))
      )}

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

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useQuanLyStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 8 },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    sub: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    pilotHint: { fontSize: 11 * fontScale, color: c.muted, fontStyle: "italic" as const, marginBottom: 12 },
  }));
}
