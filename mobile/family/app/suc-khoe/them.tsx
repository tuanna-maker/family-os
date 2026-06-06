import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { DateTimeField, TimeField, toLocalIso } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { FamilyMemberSelect } from "@mobile/components/family/FamilyMemberSelect";
import { ProfileMemberBanner } from "@mobile/components/health/ProfileMemberBanner";
import { ProfileRelatedSection } from "@mobile/components/health/ProfileRelatedSection";
import { PILOT_APPTS, PILOT_MEDS, PILOT_PROFILES } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listHealth,
  upsertAppointment,
  upsertHealthProfile,
  upsertMedicine,
} from "@mobile/api/health";
import { toast } from "@mobile/utils/toast";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

type FormType = "appt" | "med" | "profile" | "allergy" | "condition";

const FORM_TITLES: Record<FormType, [string, string]> = {
  appt: ["Thêm lịch khám", "Sửa lịch khám"],
  med: ["Thêm nhắc thuốc", "Sửa nhắc thuốc"],
  profile: ["Thêm hồ sơ", "Sửa hồ sơ"],
  allergy: ["Thêm dị ứng", "Sửa dị ứng"],
  condition: ["Thêm bệnh nền", "Sửa bệnh nền"],
};

const BACK_ROUTES: Record<FormType, string> = {
  appt: "/suc-khoe/dat-lich",
  med: "/suc-khoe/nhac-thuoc",
  profile: "/suc-khoe/ho-so",
  allergy: "/suc-khoe/di-ung",
  condition: "/suc-khoe/benh-nen",
};

function isPilotId(id?: string) {
  if (!id) return true;
  if (id.startsWith("pilot-")) return true;
  if (/^p\d+$/.test(id)) return true;
  return false;
}

function hasPrefetchParams(
  formType: FormType,
  id?: string,
  profileId?: string,
  memberName?: string,
) {
  if (memberName) return true;
  if (formType === "appt" && id && PILOT_APPTS.some((a) => a.id === id)) return true;
  if (formType === "med" && id && PILOT_MEDS.some((m) => m.id === id)) return true;
  const pid = profileId ?? id;
  if (
    pid &&
    (formType === "profile" || formType === "allergy" || formType === "condition") &&
    PILOT_PROFILES.some((p) => p.id === pid)
  ) {
    return true;
  }
  return false;
}

export default function SucKhoeThemScreen() {
  const router = useRouter();
  const styles = useFormStyles();
  const params = useLocalSearchParams<{
    type?: FormType;
    id?: string;
    profileId?: string;
    back?: string;
    memberName?: string;
    doctor?: string;
    apptAt?: string;
    medicine?: string;
    medTime?: string;
    bloodType?: string;
    allergies?: string;
    conditions?: string;
    detail?: string;
  }>();
  const { type = "appt", id, profileId, back, memberName: paramMember } = params;
  const formType = (type ?? "appt") as FormType;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const editing = !!(id || profileId);
  const prefetched = hasPrefetchParams(formType, id, profileId, paramMember);
  const { meds: allMeds, appts: allAppts } = useHealthOverview();
  const { openForm: openHealthForm } = useHealthMutations(back ?? BACK_ROUTES[formType]);

  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId && editing && !prefetched,
    staleTime: 60_000,
  });

  const [memberName, setMemberName] = useState(params.memberName ?? "");
  const [doctor, setDoctor] = useState(params.doctor ?? "");
  const [apptAt, setApptAt] = useState(params.apptAt ?? toLocalIso(new Date()));
  const [medicine, setMedicine] = useState(params.medicine ?? "");
  const [medTime, setMedTime] = useState(params.medTime ?? "08:00");
  const [bloodType, setBloodType] = useState(params.bloodType ?? "");
  const [allergies, setAllergies] = useState(params.allergies ?? "");
  const [conditions, setConditions] = useState(params.conditions ?? "");
  const [detail, setDetail] = useState(params.detail ?? "");
  const [hydrated, setHydrated] = useState(!editing || prefetched);

  const existingAppt = useMemo(
    () => (formType === "appt" && id ? q.data?.appts?.find((a) => a.id === id) : null),
    [formType, id, q.data],
  );
  const existingMed = useMemo(
    () => (formType === "med" && id ? q.data?.meds?.find((m) => m.id === id) : null),
    [formType, id, q.data],
  );
  const existingProfile = useMemo(() => {
    const pid = profileId ?? (formType === "profile" ? id : undefined);
    if (!pid || !q.data) return null;
    return q.data.profiles.find((p) => p.id === pid) ?? null;
  }, [formType, id, profileId, q.data]);

  useEffect(() => {
    if (prefetched) {
      setHydrated(true);
      return;
    }
    if (editing && q.isLoading) return;

    if (existingAppt) {
      setMemberName(existingAppt.member_name);
      setDoctor(existingAppt.doctor ?? "");
      setApptAt(toLocalIso(new Date(existingAppt.scheduled_at)));
      setHydrated(true);
      return;
    }
    if (existingMed) {
      setMemberName(existingMed.member_name);
      setMedicine(existingMed.medicine);
      setMedTime(existingMed.time_of_day?.slice(0, 5) ?? "08:00");
      setHydrated(true);
      return;
    }
    if (existingProfile) {
      setMemberName(existingProfile.name);
      setBloodType(existingProfile.blood_type ?? "");
      setAllergies(existingProfile.allergies ?? "");
      setConditions(existingProfile.conditions ?? "");
      if (formType === "allergy") setDetail(existingProfile.allergies ?? "");
      if (formType === "condition") setDetail(existingProfile.conditions ?? "");
      setHydrated(true);
      return;
    }

    if (formType === "appt" && id) {
      const pilot = PILOT_APPTS.find((a) => a.id === id);
      if (pilot) {
        setMemberName(pilot.member_name);
        setDoctor(pilot.doctor ?? "");
        setApptAt(toLocalIso(new Date(pilot.scheduled_at)));
        setHydrated(true);
        return;
      }
    }
    if (formType === "med" && id) {
      const pilot = PILOT_MEDS.find((m) => m.id === id);
      if (pilot) {
        setMemberName(pilot.member_name);
        setMedicine(pilot.medicine);
        setMedTime(pilot.time_of_day?.slice(0, 5) ?? "08:00");
        setHydrated(true);
        return;
      }
    }
    const pid = profileId ?? id;
    if (pid && (formType === "profile" || formType === "allergy" || formType === "condition")) {
      const pilot = PILOT_PROFILES.find((p) => p.id === pid);
      if (pilot) {
        setMemberName(pilot.name);
        setBloodType(pilot.blood_type ?? "");
        setAllergies(pilot.allergies ?? "");
        setConditions(pilot.conditions ?? "");
        setHydrated(true);
        return;
      }
    }

    setHydrated(true);
  }, [
    prefetched,
    editing,
    q.isLoading,
    existingAppt,
    existingMed,
    existingProfile,
    formType,
    id,
    profileId,
  ]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["health-overview", familyId] });

  const save = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error("Chưa có gia đình");
      if (formType === "appt") {
        if (!memberName.trim()) throw new Error("Chọn thành viên");
        return upsertAppointment({
          id: isPilotId(id) ? undefined : id,
          family_id: familyId,
          member_name: memberName.trim(),
          doctor: doctor.trim() || null,
          scheduled_at: new Date(apptAt).toISOString(),
          status: "planned",
        });
      }
      if (formType === "med") {
        if (!memberName.trim() || !medicine.trim()) throw new Error("Nhập đủ thông tin");
        return upsertMedicine({
          id: isPilotId(id) ? undefined : id,
          family_id: familyId,
          member_name: memberName.trim(),
          medicine: medicine.trim(),
          time_of_day: medTime,
          active: true,
        });
      }
      const pid = profileId ?? (isPilotId(id) ? undefined : id);
      if (formType === "profile") {
        if (!memberName.trim()) throw new Error("Chọn thành viên");
        return upsertHealthProfile({
          id: pid,
          family_id: familyId,
          name: memberName.trim(),
          blood_type: bloodType.trim() || null,
          allergies: allergies.trim() || null,
          conditions: conditions.trim() || null,
        });
      }
      if (formType === "allergy" || formType === "condition") {
        if (!existingProfile && !memberName.trim()) throw new Error("Chọn thành viên");
        const name = existingProfile?.name ?? memberName.trim();
        return upsertHealthProfile({
          id: existingProfile?.id,
          family_id: familyId,
          name,
          blood_type: existingProfile?.blood_type ?? null,
          allergies: formType === "allergy" ? detail.trim() || null : existingProfile?.allergies ?? null,
          conditions: formType === "condition" ? detail.trim() || null : existingProfile?.conditions ?? null,
        });
      }
      throw new Error("Loại form không hợp lệ");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Đã lưu");
      router.replace((back ?? BACK_ROUTES[formType]) as never);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [, editT] = FORM_TITLES[formType];
  const pageTitle = editing ? editT : FORM_TITLES[formType][0];
  const backHref = back ?? BACK_ROUTES[formType];
  const showMemberSelect =
    (formType === "appt" || formType === "med" || formType === "profile") && !memberName;

  const memberMeds = useMemo(
    () => (memberName ? allMeds.filter((m) => m.member_name === memberName && m.active) : []),
    [allMeds, memberName],
  );
  const memberAppts = useMemo(
    () => (memberName ? allAppts.filter((a) => a.member_name === memberName) : []),
    [allAppts, memberName],
  );
  const profileBack = back ?? BACK_ROUTES.profile;
  const profileReturnBack = useMemo(() => {
    if (!memberName || formType !== "profile") return profileBack;
    const q = new URLSearchParams({
      type: "profile",
      memberName,
      bloodType,
      allergies,
      conditions,
      back: profileBack,
    });
    const pid = profileId ?? id;
    if (pid) {
      q.set("id", pid);
      q.set("profileId", pid);
    }
    return `/suc-khoe/them?${q.toString()}`;
  }, [memberName, formType, profileBack, bloodType, allergies, conditions, profileId, id]);

  if (!hydrated) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={pageTitle} back={backHref} />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Sức khỏe gia đình" title={pageTitle} back={backHref} />

      {showMemberSelect ? (
        <FamilyMemberSelect value={memberName} onChange={setMemberName} />
      ) : memberName && formType === "profile" ? (
        <ProfileMemberBanner name={memberName} />
      ) : memberName && (formType === "appt" || formType === "med") ? (
        <ProfileMemberBanner name={memberName} />
      ) : null}

      {formType === "appt" && (
        <>
          <TextField label="Bác sĩ / Cơ sở" value={doctor} onChangeText={setDoctor} placeholder="BS. Minh" />
          <DateTimeField label="Thời gian khám" value={apptAt} onChange={setApptAt} />
        </>
      )}

      {formType === "med" && (
        <>
          <TextField label="Tên thuốc *" value={medicine} onChangeText={setMedicine} placeholder="Vitamin D3" />
          <TimeField label="Giờ uống" value={medTime} onChange={setMedTime} />
        </>
      )}

      {formType === "profile" && (
        <>
          <Text style={styles.sectionLabel}>Thông tin cơ bản</Text>
          <TextField label="Nhóm máu" value={bloodType} onChangeText={setBloodType} placeholder="O+" />
          <TextField
            label="Dị ứng"
            value={allergies}
            onChangeText={setAllergies}
            multiline
            placeholder="Hải sản, đậu phộng…"
          />
          <TextField
            label="Bệnh nền"
            value={conditions}
            onChangeText={setConditions}
            multiline
            placeholder="Cao huyết áp, tiểu đường…"
          />

          {memberName ? (
            <>
              <ProfileRelatedSection
                title="Đơn thuốc"
                emptyText="Chưa có đơn thuốc cho thành viên này."
                addLabel="Thêm"
                meds={memberMeds}
                onAdd={() =>
                  openHealthForm({
                    type: "med",
                    memberName,
                    back: profileReturnBack,
                  })
                }
                onMedPress={(m) =>
                  openHealthForm({
                    type: "med",
                    id: m.id,
                    memberName: m.member_name,
                    medicine: m.medicine,
                    medTime: m.time_of_day?.slice(0, 5) ?? "08:00",
                    back: profileReturnBack,
                  })
                }
              />
              <ProfileRelatedSection
                title="Lịch khám"
                emptyText="Chưa có lịch khám cho thành viên này."
                addLabel="Thêm"
                appts={memberAppts}
                onAdd={() =>
                  openHealthForm({
                    type: "appt",
                    memberName,
                    back: profileReturnBack,
                  })
                }
                onApptPress={(a) =>
                  openHealthForm({
                    type: "appt",
                    id: a.id,
                    memberName: a.member_name,
                    doctor: a.doctor ?? "",
                    apptAt: toLocalIso(new Date(a.scheduled_at)),
                    back: profileReturnBack,
                  })
                }
              />
            </>
          ) : null}
        </>
      )}

      {(formType === "allergy" || formType === "condition") && (
        <>
          {memberName ? (
            <Text style={styles.memberHint}>Thành viên: {memberName}</Text>
          ) : (
            <FamilyMemberSelect value={memberName} onChange={setMemberName} />
          )}
          <TextField
            label={formType === "allergy" ? "Dị ứng" : "Bệnh nền"}
            value={detail}
            onChangeText={setDetail}
            multiline
            placeholder={formType === "allergy" ? "Hải sản, đậu phộng…" : "Cao huyết áp, tiểu đường…"}
          />
        </>
      )}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton label="Lưu" onPress={() => save.mutate()} loading={save.isPending} />
      </View>
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useFormStyles() {
  return useThemedStyles((c, fontScale) => ({
    memberHint: {
      fontSize: 14 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      marginBottom: 12,
    },
    sectionLabel: {
      fontSize: 15 * fontScale,
      fontWeight: "800" as const,
      color: c.foreground,
      marginBottom: 12,
    },
  }));
}
