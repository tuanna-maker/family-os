import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
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
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate, formatDateTime } from "@mobile/i18n/format";

const PILOT_PROFILES = [
  { name: "Anh Hùng", blood_type: "O+", dob: null, allergies: null, conditions: null },
  { name: "Chị Lan", blood_type: "A+", dob: null, allergies: "Hải sản", conditions: null },
  { name: "Bé Minh", blood_type: "O+", dob: null, allergies: null, conditions: null },
  { name: "Bà Ngoại", blood_type: "B+", dob: null, allergies: null, conditions: "Cao huyết áp" },
];

export default function SucKhoeQuanLyScreen() {
  const { colors } = useTheme();
  const styles = useQuanLyStyles();
  const { locale, s } = useI18n();
  const c = s.common;
  const h = s.screens.health;
  const sp = h.subpage;
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
      toast.success(c.profileAdded);
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
      toast.success(c.medicineAdded);
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
      toast.success(h.apptAdded);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteHealthRow,
    onSuccess: () => {
      toast.success(c.deleted);
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
        eyebrow={c.familyCore}
        title={h.manage}
        subtitle={h.manageSub}
        back="/suc-khoe"
      />

      <SectionHeader title={h.profile} subtitle={h.memberCount(profiles.length)} />
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
                  {[p.blood_type && sp.bloodTypeLabel(p.blood_type)].filter(Boolean).join(" · ") || "—"}
                </Text>
                {p.allergies ? <Text style={styles.sub}>{sp.allergyLabel(p.allergies)}</Text> : null}
                {p.conditions ? <Text style={styles.sub}>📋 {p.conditions}</Text> : null}
              </View>
            </Card>
          ))}
          <Text style={styles.pilotHint}>{sp.pilotProfilesHint}</Text>
        </>
      ) : profiles.length === 0 ? (
        <EmptyState title={h.noProfile} description={h.noProfileDesc} />
      ) : (
        profiles.map((p) => (
          <Card key={p.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tintBlue }]}>
              <UserCircle2 color={colors.brand} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{p.name}</Text>
              <Text style={styles.sub}>
                {[
                  p.blood_type && sp.bloodTypeLabel(p.blood_type),
                  p.dob && sp.born(formatDate(p.dob, locale)),
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                appAlert(h.deleteProfile, p.name, [
                  { text: c.cancel, style: "cancel" },
                  { text: c.delete, style: "destructive", onPress: () => delMut.mutate({ table: "health_profiles", id: p.id }) },
                ])
              }
            >
              <Trash2 color={colors.muted} size={16} />
            </Pressable>
          </Card>
        ))
      )}

      <SectionHeader title={h.addProfile} />
      <TextField label={h.memberName} value={profileName} onChangeText={setProfileName} placeholder={h.form.memberPh} />
      <TextField label={h.bloodType} value={profileBlood} onChangeText={setProfileBlood} placeholder="A+" />
      <PrimaryButton
        label={c.saveProfile}
        onPress={() => addProfile.mutate()}
        disabled={!profileName.trim()}
        loading={addProfile.isPending}
      />

      <SectionHeader title={h.medicine} subtitle={h.medicineActive(meds.filter((m) => m.active).length)} />
      {meds.length === 0 ? (
        <EmptyState title={h.noReminder} description={h.noReminderDesc} />
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
              <Text style={styles.sub}>{m.time_of_day?.slice(0, 5) ?? h.daily}</Text>
            </View>
            <Pressable
              onPress={() =>
                appAlert(h.deleteRecord, m.medicine, [
                  { text: c.cancel, style: "cancel" },
                  { text: c.delete, style: "destructive", onPress: () => delMut.mutate({ table: "medicine_reminders", id: m.id }) },
                ])
              }
            >
              <Trash2 color={colors.emergency} size={16} />
            </Pressable>
          </Card>
        ))
      )}

      <SectionHeader title={h.addMedicineSection} />
      <TextField label={h.member} value={medMember} onChangeText={setMedMember} placeholder="Bé Minh" />
      <TextField label={c.medicine} value={medName} onChangeText={setMedName} />
      <TextField label={h.medicineTime} value={medTime} onChangeText={setMedTime} />
      <PrimaryButton
        label={c.saveMedicine}
        onPress={() => addMed.mutate()}
        disabled={!medMember.trim() || !medName.trim()}
        loading={addMed.isPending}
      />

      <SectionHeader title={h.appointment} subtitle={h.apptCount(appts.length)} />
      {appts.length === 0 ? (
        <EmptyState title={h.noAppt} description={h.noApptDesc} />
      ) : (
        appts.map((a) => (
          <Card key={a.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tintGreen }]}>
              <Stethoscope color={colors.success} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{a.member_name}</Text>
              <Text style={styles.sub}>
                {formatDateTime(a.scheduled_at, locale)}
                {a.doctor ? ` · ${a.doctor}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                appAlert(h.deleteRecord, a.member_name, [
                  { text: c.cancel, style: "cancel" },
                  { text: c.delete, style: "destructive", onPress: () => delMut.mutate({ table: "medical_appointments", id: a.id }) },
                ])
              }
            >
              <Trash2 color={colors.emergency} size={16} />
            </Pressable>
          </Card>
        ))
      )}

      <SectionHeader title={h.addAppt} />
      <TextField label={h.member} value={apptMember} onChangeText={setApptMember} />
      <TextField label={h.doctorFacility} value={apptDoctor} onChangeText={setApptDoctor} />
      <DateTimeField label={h.apptTime} value={apptAt} onChange={setApptAt} />
      <PrimaryButton
        label={h.saveAppt}
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
