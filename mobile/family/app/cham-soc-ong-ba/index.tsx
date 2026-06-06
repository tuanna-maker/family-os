import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ChevronRight,
  MapPin,
  NotebookPen,
  Pill,
  Plus,
  Send,
  Stethoscope,
  Trash2,
} from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { SafeCheckPanel } from "@mobile/components/elderly-care/SafeCheckPanel";
import { MedicineWeekView } from "@mobile/components/elderly-care/MedicineWeekView";
import { ContactQuickGrid } from "@mobile/components/elderly-care/ContactQuickGrid";
import { MedicineConfirmModal } from "@mobile/components/elderly-care/MedicineConfirmModal";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useAuth } from "@mobile/hooks/useAuth";
import {
  addCareNote,
  confirmSafeCheck,
  createElderlyProfile,
  createMedicineReminder,
  deleteElderlyProfile,
  listCareNotes,
  listElderlyActivity,
  listElderlyProfiles,
  listMedicineReminders,
  listMedicineWeek,
  listSafeChecks,
  listVitals,
  addVital,
  markMedicineTaken,
  undoMedicineTaken,
  updateElderlyProfile,
  type ActivityRow,
  type ElderlyProfileRow,
  type MedicineReminderRow,
} from "@mobile/api/elderly-care";
import { createSecurityRequest } from "@mobile/api/security";
import { emergencyContacts } from "@mobile/constants/emergency-contacts";
import { loadFamilyContacts } from "@mobile/lib/family-contacts";
import { supabase } from "@shared/supabase/get-client";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { TimeField } from "@mobile/components/DateTimeField";

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const actKindStyle = (c: ReturnType<typeof useTheme>["colors"], kind: ActivityRow["kind"]) => {
  if (kind === "med") return { bg: c.tintGreen, fg: c.success };
  if (kind === "vital") return { bg: c.tintOrange, fg: c.warning };
  if (kind === "check") return { bg: c.tintBlue, fg: c.brand };
  return { bg: c.tintPink, fg: c.pink };
};

export default function ChamSocOngBaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { familyId } = useFamilyContext();
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [medsView, setMedsView] = useState<"day" | "week">("day");
  const [showVital, setShowVital] = useState(false);
  const [safeNoteDraft, setSafeNoteDraft] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [confirmMed, setConfirmMed] = useState<MedicineReminderRow | null>(null);
  const [confirmTime, setConfirmTime] = useState("");
  const [confirmNote, setConfirmNote] = useState("");

  const styles = useThemedStyles((c, fontScale) => ({
    pageSub: {
      fontSize: 13 * fontScale,
      color: c.muted,
      marginTop: -4,
      marginBottom: 12,
      lineHeight: 18,
    },
    chipRow: { flexDirection: "row" as const, gap: 8 },
    chip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.brandDeep, borderColor: c.brandDeep },
    chipText: { fontWeight: "600" as const, color: c.foreground },
    chipTextActive: { color: c.white },
    chipAdd: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.cardBorder,
    },
    chipAddText: { color: c.muted, fontWeight: "600" as const },
    profileRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    avatarBox: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: c.tintPink,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarBig: { fontSize: 26 },
    profileName: { fontSize: 16 * fontScale, fontWeight: "800" as const, color: c.foreground },
    profileActions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    muted: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    addressRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginTop: 4 },
    conditionChip: {
      fontSize: 11 * fontScale,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.tintRed,
      color: c.emergency,
      fontWeight: "600" as const,
      overflow: "hidden" as const,
    },
    conditionsWrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6, marginTop: 10 },
    sectionGap: { marginBottom: 16 },
    editLink: { color: c.brand, fontWeight: "700" as const, fontSize: 13 * fontScale, marginRight: 8 },
    medsToggleRow: { flexDirection: "row" as const, gap: 8, marginBottom: 12 },
    medsToggle: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      backgroundColor: c.card,
    },
    medsToggleActive: { backgroundColor: c.brand, borderColor: c.brand },
    medsToggleText: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.foreground },
    medsToggleTextActive: { color: c.white },
    medRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      marginBottom: 8,
      padding: 14,
    },
    medIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    medTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    medDone: { textDecorationLine: "line-through" as const, color: c.muted },
    medBtn: {
      backgroundColor: c.brand,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.md,
      minWidth: 88,
      alignItems: "center" as const,
    },
    medBtnDone: { backgroundColor: c.mutedBg },
    medBtnText: { color: c.white, fontSize: 11 * fontScale, fontWeight: "700" as const },
    medBtnTextMuted: { color: c.muted },
    vitalGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 16 },
    vitalCard: { width: "47%" as const, padding: 12 },
    vitalVal: { fontSize: 20 * fontScale, fontWeight: "800" as const, marginTop: 4, color: c.foreground },
    noteRow: { flexDirection: "row" as const, gap: 8, marginBottom: 12 },
    noteInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radius.lg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.foreground,
      fontSize: 14 * fontScale,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.brand,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    noteItem: {
      flexDirection: "row" as const,
      gap: 8,
      marginBottom: 10,
      backgroundColor: c.mutedBg,
      padding: 12,
      borderRadius: radius.lg,
    },
    noteAuthor: { fontSize: 11 * fontScale, fontWeight: "700" as const, color: c.foreground },
    noteBody: { fontSize: 13 * fontScale, color: c.muted, marginTop: 4 },
    noteTime: { fontSize: 11 * fontScale, color: c.muted, marginLeft: "auto" as const },
    actRow: { flexDirection: "row" as const, gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    actIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    actTitle: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, flex: 1 },
    actDetail: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    actTime: { fontSize: 11 * fontScale, color: c.muted },
    doctorCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: c.tintBlue,
      marginTop: 16,
      marginBottom: 8,
    },
    doctorLabel: {
      fontSize: 11 * fontScale,
      fontWeight: "600" as const,
      color: c.brand,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    doctorName: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, marginTop: 2 },
    linkAction: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.brand },
    journalLink: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      marginTop: 8,
      marginBottom: 12,
    },
    journalText: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.brand },
    emptyMed: { color: c.muted, textAlign: "center" as const, padding: 16, fontSize: 14 * fontScale },
  }));

  const profilesQ = useQuery({
    queryKey: ["elderly-profiles", familyId],
    queryFn: () => listElderlyProfiles({ familyId: familyId! }),
    enabled: !!familyId,
  });

  const profiles = profilesQ.data ?? [];
  const profile: ElderlyProfileRow | null = useMemo(() => {
    if (!profiles.length) return null;
    return profiles.find((p) => p.id === selectedId) ?? profiles[0];
  }, [profiles, selectedId]);

  const medsQ = useQuery({
    queryKey: ["elderly-meds", familyId, profile?.name],
    queryFn: () => listMedicineReminders({ familyId: familyId!, memberName: profile!.name }),
    enabled: !!familyId && !!profile,
  });

  const weekQ = useQuery({
    queryKey: ["elderly-meds-week", familyId, profile?.name],
    queryFn: () => listMedicineWeek({ familyId: familyId!, memberName: profile!.name, days: 7 }),
    enabled: !!familyId && !!profile,
  });

  const notesQ = useQuery({
    queryKey: ["elderly-notes", profile?.id],
    queryFn: () => listCareNotes({ elderlyId: profile!.id }),
    enabled: !!profile,
  });

  const vitalsQ = useQuery({
    queryKey: ["elderly-vitals", familyId, profile?.name],
    queryFn: () => listVitals({ familyId: familyId!, memberName: profile!.name }),
    enabled: !!familyId && !!profile,
  });

  const actQ = useQuery({
    queryKey: ["elderly-activity", profile?.id],
    queryFn: () => listElderlyActivity({ elderlyId: profile!.id, familyId: familyId! }),
    enabled: !!profile && !!familyId,
  });

  const safeQ = useQuery({
    queryKey: ["safe-checks", profile?.id],
    queryFn: () => listSafeChecks({ elderlyId: profile!.id }),
    enabled: !!profile,
  });

  const contactsQ = useQuery({
    queryKey: ["family-contacts", familyId],
    queryFn: () => loadFamilyContacts(familyId!),
    enabled: !!familyId,
  });

  const quickContacts = useMemo(() => {
    const slots = contactsQ.data ?? [];
    const byId = Object.fromEntries(slots.map((s) => [s.id, s]));
    return emergencyContacts.map((c) => {
      if (c.kind === "sos") return c;
      const slot = byId[c.kind];
      if (!slot) return c;
      return { ...c, name: slot.name, phone: slot.phone };
    });
  }, [contactsQ.data]);

  useEffect(() => {
    if (!profile?.id || !familyId) return;
    const ch = supabase
      .channel(`rn-safe:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safe_checks", filter: `elderly_id=eq.${profile.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["safe-checks", profile.id] });
          qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
          qc.invalidateQueries({ queryKey: ["elderly-activity", profile.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "elderly_profiles", filter: `id=eq.${profile.id}` },
        () => qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medicine_logs", filter: `family_id=eq.${familyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile.name] });
          qc.invalidateQueries({ queryKey: ["elderly-meds-week", familyId, profile.name] });
          qc.invalidateQueries({ queryKey: ["elderly-activity", profile.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [profile?.id, profile?.name, familyId, qc]);

  const invalidateMeds = () => {
    qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] });
    qc.invalidateQueries({ queryKey: ["elderly-meds-week", familyId, profile?.name] });
    qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
  };

  const createProfile = useMutation({
    mutationFn: createElderlyProfile,
    onSuccess: () => {
      toast.success("Đã thêm hồ sơ");
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
      setShowAddProfile(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delProfile = useMutation({
    mutationFn: deleteElderlyProfile,
    onSuccess: () => {
      toast.success("Đã xóa hồ sơ");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const safeMut = useMutation({
    mutationFn: (input: { status: "ok" | "warn" | "alert"; note?: string }) =>
      confirmSafeCheck({
        elderly_id: profile!.id,
        family_id: profile!.family_id,
        status: input.status,
        note: input.note,
      }),
    onSuccess: (_d, vars) => {
      toast.success(`Safe Check: ${vars.status}`);
      setSafeNoteDraft("");
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
      qc.invalidateQueries({ queryKey: ["safe-checks", profile?.id] });
      qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const takenMut = useMutation({
    mutationFn: markMedicineTaken,
    onSuccess: (_d, vars) => {
      invalidateMeds();
      setConfirmMed(null);
      toast.success("Đã ghi nhận uống thuốc");
      void vars;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMut = useMutation({
    mutationFn: undoMedicineTaken,
    onSuccess: invalidateMeds,
  });

  const createMed = useMutation({
    mutationFn: createMedicineReminder,
    onSuccess: () => {
      toast.success("Đã thêm nhắc thuốc");
      invalidateMeds();
      setShowAddMed(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNoteMut = useMutation({
    mutationFn: () =>
      addCareNote({
        elderly_id: profile!.id,
        family_id: profile!.family_id,
        content: noteInput.trim(),
        author_name: user?.email ?? "Bạn",
      }),
    onSuccess: () => {
      setNoteInput("");
      qc.invalidateQueries({ queryKey: ["elderly-notes", profile?.id] });
      qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProfileMut = useMutation({
    mutationFn: updateElderlyProfile,
    onSuccess: () => {
      toast.success("Đã lưu hồ sơ");
      setShowEditProfile(false);
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addVitalMut = useMutation({
    mutationFn: addVital,
    onSuccess: () => {
      toast.success("Đã ghi chỉ số");
      setShowVital(false);
      qc.invalidateQueries({ queryKey: ["elderly-vitals", familyId, profile?.name] });
      qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCall = async (label: string, phone: string, isSos: boolean) => {
    if (isSos && profile) {
      try {
        await createSecurityRequest({
          request_type: "sos",
          elderly_id: profile.id,
          apartment: profile.name,
        });
        toast.success("Đã gửi SOS tới bảo an");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không gửi được SOS");
      }
    }
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  const openConfirmMed = (m: MedicineReminderRow) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setConfirmTime(`${hh}:${mm}`);
    setConfirmNote("");
    setConfirmMed(m);
  };

  const submitConfirmMed = () => {
    if (!confirmMed || !familyId) return;
    const [hh, mm] = confirmTime.split(":").map(Number);
    const at = new Date();
    if (!Number.isNaN(hh)) at.setHours(hh, mm ?? 0, 0, 0);
    takenMut.mutate({
      reminder_id: confirmMed.id,
      family_id: familyId,
      taken_at: at.toISOString(),
      note: confirmNote.trim() || undefined,
    });
  };

  const markWeekMed = (reminderId: string) => {
    if (!familyId) return;
    takenMut.mutate({
      reminder_id: reminderId,
      family_id: familyId,
      taken_at: new Date().toISOString(),
    });
  };

  const meds = medsQ.data ?? [];
  const takenCount = meds.filter((m) => m.taken_today).length;
  const activity = actQ.data ?? [];
  const vitals = vitalsQ.data ?? [];

  return (
    <Screen scroll={false} contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Family Core" title="Chăm sóc ông bà" back="/(tabs)/gia-dinh" />
      <Text style={styles.pageSub}>Quan tâm mỗi ngày — Safe Check, thuốc và liên hệ khẩn cấp 👵</Text>

      {profilesQ.isLoading && <LoadingState />}

      {!profilesQ.isLoading && profiles.length === 0 && (
        <>
          <EmptyState
            title="Chưa có hồ sơ ông/bà"
            description="Thêm hồ sơ để theo dõi Safe Check và nhắc thuốc."
          />
          <AddProfileForm
            pending={createProfile.isPending}
            onSubmit={(p) => createProfile.mutate({ family_id: familyId!, ...p })}
          />
        </>
      )}

      {profiles.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 24 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={styles.chipRow}>
              {profiles.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.chip, profile?.id === p.id && styles.chipActive]}
                  onPress={() => setSelectedId(p.id)}
                >
                  <Text>{p.avatar ?? "👵"}</Text>
                  <Text style={[styles.chipText, profile?.id === p.id && styles.chipTextActive]}>{p.name}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.chipAdd} onPress={() => setShowAddProfile((s) => !s)}>
                <Plus color={themeColors.muted} size={16} />
                <Text style={styles.chipAddText}>Thêm</Text>
              </Pressable>
            </View>
          </ScrollView>

          {showAddProfile && (
            <AddProfileForm
              pending={createProfile.isPending}
              onSubmit={(p) => createProfile.mutate({ family_id: familyId!, ...p })}
            />
          )}

          {profile && (
            <>
              <Card style={styles.sectionGap}>
                <View style={styles.profileRow}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarBig}>{profile.avatar ?? "👵"}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {profile.name}
                      {profile.age != null ? (
                        <Text style={styles.muted}> · {profile.age} tuổi</Text>
                      ) : null}
                    </Text>
                    {profile.relation ? <Text style={styles.muted}>{profile.relation}</Text> : null}
                    {profile.address ? (
                      <View style={styles.addressRow}>
                        <MapPin color={themeColors.muted} size={12} />
                        <Text style={styles.muted} numberOfLines={1}>
                          {profile.address}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.profileActions}>
                    <Pressable onPress={() => setShowEditProfile((s) => !s)}>
                      <Text style={styles.editLink}>Sửa</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert("Xóa hồ sơ?", profile.name, [
                          { text: "Huỷ", style: "cancel" },
                          { text: "Xóa", style: "destructive", onPress: () => delProfile.mutate({ id: profile.id }) },
                        ])
                      }
                    >
                      <Trash2 color={themeColors.emergency} size={18} />
                    </Pressable>
                  </View>
                </View>

                {profile.conditions.length > 0 && (
                  <View style={styles.conditionsWrap}>
                    {profile.conditions.map((c) => (
                      <Text key={c} style={styles.conditionChip}>
                        {c}
                      </Text>
                    ))}
                  </View>
                )}

                {showEditProfile && (
                  <EditProfileForm
                    profile={profile}
                    pending={updateProfileMut.isPending}
                    onSubmit={(p) => updateProfileMut.mutate({ id: profile.id, ...p })}
                  />
                )}
              </Card>

              <Card style={styles.sectionGap}>
                <SafeCheckPanel
                  profile={profile}
                  history={safeQ.data ?? []}
                  historyLoading={safeQ.isLoading}
                  note={safeNoteDraft}
                  onNoteChange={setSafeNoteDraft}
                  onConfirm={(status, note) => safeMut.mutate({ status, note })}
                  isPending={safeMut.isPending}
                />
              </Card>

              <View style={styles.sectionGap}>
              <SectionHeader
                title="Liên hệ nhanh"
                subtitle="Nút lớn — dễ bấm cho mọi người"
                action={
                  <Pressable onPress={() => router.push("/lien-he")}>
                    <Text style={styles.linkAction}>Sửa số</Text>
                  </Pressable>
                }
              />
              <ContactQuickGrid
                contacts={quickContacts}
                elderName={profile.name}
                elderPhone={profile.phone}
                onCall={handleCall}
              />
              </View>

              <SectionHeader
                title={medsView === "day" ? "Nhắc thuốc hôm nay" : "Lịch thuốc 7 ngày"}
                subtitle={
                  medsView === "day"
                    ? `${takenCount}/${meds.length} đã uống · ${profile.name}`
                    : `${profile.name} · tự cập nhật`
                }
                onAction={() => setShowAddMed((s) => !s)}
                actionLabel="Thêm"
              />
              <View style={styles.medsToggleRow}>
                {(["day", "week"] as const).map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.medsToggle, medsView === v && styles.medsToggleActive]}
                    onPress={() => setMedsView(v)}
                  >
                    <Text style={[styles.medsToggleText, medsView === v && styles.medsToggleTextActive]}>
                      {v === "day" ? "Theo ngày" : "Theo tuần"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {showAddMed && (
                <AddMedForm
                  pending={createMed.isPending}
                  onSubmit={(m) =>
                    createMed.mutate({
                      family_id: familyId!,
                      member_name: profile.name,
                      ...m,
                    })
                  }
                />
              )}

              {medsView === "week" ? (
                <MedicineWeekView
                  days={weekQ.data ?? []}
                  isLoading={weekQ.isLoading}
                  onMark={markWeekMed}
                  pending={takenMut.isPending}
                />
              ) : meds.length === 0 ? (
                <Card>
                  <Text style={styles.emptyMed}>Chưa có nhắc thuốc — bấm Thêm ở trên.</Text>
                </Card>
              ) : (
                meds.map((m) => (
                  <Card key={m.id} style={styles.medRow}>
                    <View
                      style={[
                        styles.medIcon,
                        { backgroundColor: m.taken_today ? themeColors.tintGreen : themeColors.tintOrange },
                      ]}
                    >
                      <Pill color={m.taken_today ? themeColors.success : themeColors.warning} size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medTitle, m.taken_today && styles.medDone]}>{m.medicine}</Text>
                      {m.dosage ? <Text style={styles.muted}>{m.dosage}</Text> : null}
                      <Text style={styles.muted}>
                        {m.time_of_day ?? "—"}
                        {m.taken_today && m.taken_at ? ` · Đã uống lúc ${fmtTime(m.taken_at)}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.medBtn, m.taken_today && styles.medBtnDone]}
                      disabled={takenMut.isPending || undoMut.isPending}
                      onPress={() =>
                        m.taken_today ? undoMut.mutate({ reminder_id: m.id }) : openConfirmMed(m)
                      }
                    >
                      <Text style={[styles.medBtnText, m.taken_today && styles.medBtnTextMuted]}>
                        {m.taken_today ? "Đã uống" : "Xác nhận"}
                      </Text>
                    </Pressable>
                  </Card>
                ))
              )}

              {vitals.length > 0 && (
                <>
                  <SectionHeader title="Chỉ số gần đây" subtitle={profile.name} />
                  <View style={styles.vitalGrid}>
                    {vitals.map((v) => (
                      <Card key={v.id} style={styles.vitalCard}>
                        <Text style={styles.muted}>{v.title}</Text>
                        <Text style={styles.vitalVal}>{v.value ?? "—"}</Text>
                        <Text style={styles.muted}>{fmtRelative(v.recorded_at)}</Text>
                      </Card>
                    ))}
                  </View>
                </>
              )}

              <SectionHeader
                title="Chỉ số sức khỏe"
                onAction={() => setShowVital((s) => !s)}
                actionLabel={showVital ? "Đóng" : "Ghi mới"}
              />
              {showVital && (
                <AddVitalForm
                  pending={addVitalMut.isPending}
                  onSubmit={(v) =>
                    addVitalMut.mutate({
                      family_id: familyId!,
                      member_name: profile.name,
                      ...v,
                    })
                  }
                />
              )}

              <SectionHeader title="Ghi chú chăm sóc" subtitle="Chia sẻ giữa các thành viên" />
              <Card>
                <View style={styles.noteRow}>
                  <TextInput
                    style={styles.noteInput}
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder="Ghi nhanh về tình trạng của ông/bà…"
                    placeholderTextColor={themeColors.muted}
                  />
                  <Pressable
                    style={styles.sendBtn}
                    disabled={!noteInput.trim() || addNoteMut.isPending}
                    onPress={() => addNoteMut.mutate()}
                  >
                    <Send color={themeColors.white} size={18} />
                  </Pressable>
                </View>
                {(notesQ.data ?? []).length === 0 && !notesQ.isLoading ? (
                  <Text style={[styles.muted, { textAlign: "center", paddingVertical: 12 }]}>Chưa có ghi chú nào.</Text>
                ) : null}
                {(notesQ.data ?? []).map((n) => (
                  <View key={n.id} style={styles.noteItem}>
                    <NotebookPen color={themeColors.brand} size={14} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.noteAuthor}>{n.author_name}</Text>
                        <Text style={styles.noteTime}>{fmtRelative(n.created_at)}</Text>
                      </View>
                      <Text style={styles.noteBody}>{n.content}</Text>
                    </View>
                  </View>
                ))}
              </Card>

              <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <SectionHeader title="Nhật ký hoạt động" subtitle="7 ngày gần nhất" />
                </View>
                <Pressable style={styles.journalLink} onPress={() => router.push("/cham-soc-ong-ba/nhat-ky")}>
                  <Text style={styles.journalText}>Xem 7/30 ngày →</Text>
                  <ChevronRight color={themeColors.brand} size={16} />
                </Pressable>
              </View>

              {activity.length === 0 ? (
                <Card>
                  <Text style={styles.emptyMed}>Chưa có hoạt động.</Text>
                </Card>
              ) : (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {activity.map((a, idx) => {
                    const ks = actKindStyle(themeColors, a.kind);
                    return (
                      <View
                        key={a.id}
                        style={[styles.actRow, idx === activity.length - 1 && { borderBottomWidth: 0 }]}
                      >
                        <View style={[styles.actIcon, { backgroundColor: ks.bg }]}>
                          <Activity color={ks.fg} size={16} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.actTitle} numberOfLines={1}>
                              {a.title}
                            </Text>
                            <Text style={styles.actTime}>{fmtRelative(a.at)}</Text>
                          </View>
                          {a.detail ? (
                            <Text style={styles.actDetail} numberOfLines={2}>
                              {a.detail}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              )}

              {profile.doctor ? (
                <Card style={styles.doctorCard}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: themeColors.card,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Stethoscope color={themeColors.brand} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorLabel}>Bác sĩ phụ trách</Text>
                    <Text style={styles.doctorName}>{profile.doctor}</Text>
                  </View>
                </Card>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      <MedicineConfirmModal
        med={confirmMed}
        time={confirmTime}
        note={confirmNote}
        onTimeChange={setConfirmTime}
        onNoteChange={setConfirmNote}
        onCancel={() => setConfirmMed(null)}
        onConfirm={submitConfirmMed}
        pending={takenMut.isPending}
      />
    </Screen>
  );
}

function useFormTitleStyles() {
  return useThemedStyles((c, fontScale) => ({
    formTitle: { fontWeight: "700" as const, marginBottom: 8, color: c.foreground, fontSize: 15 * fontScale },
  }));
}

function AddProfileForm({
  onSubmit,
  pending,
}: {
  onSubmit: (p: {
    name: string;
    age?: number;
    relation?: string;
    phone?: string;
    conditions?: string[];
  }) => void;
  pending: boolean;
}) {
  const formStyles = useFormTitleStyles();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [conditions, setConditions] = useState("");

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={formStyles.formTitle}>Hồ sơ mới</Text>
      <TextField label="Tên" value={name} onChangeText={setName} placeholder="Bà Hoa" />
      <TextField label="Mối quan hệ" value={relation} onChangeText={setRelation} />
      <TextField label="Tuổi" value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextField label="Số điện thoại" value={phone} onChangeText={setPhone} />
      <TextField label="Bệnh nền (phẩy)" value={conditions} onChangeText={setConditions} />
      <PrimaryButton
        label="Lưu hồ sơ"
        disabled={!name.trim() || pending}
        loading={pending}
        onPress={() =>
          onSubmit({
            name: name.trim(),
            age: age ? Number(age) : undefined,
            relation: relation.trim() || undefined,
            phone: phone.trim() || undefined,
            conditions: conditions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
    </Card>
  );
}

function EditProfileForm({
  profile,
  onSubmit,
  pending,
}: {
  profile: ElderlyProfileRow;
  onSubmit: (p: {
    name?: string;
    age?: number | null;
    relation?: string | null;
    phone?: string | null;
    doctor?: string | null;
    conditions?: string[];
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : "");
  const [relation, setRelation] = useState(profile.relation ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [doctor, setDoctor] = useState(profile.doctor ?? "");
  const [conditions, setConditions] = useState(profile.conditions.join(", "));

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label="Tên" value={name} onChangeText={setName} />
      <TextField label="Mối quan hệ" value={relation} onChangeText={setRelation} />
      <TextField label="Tuổi" value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextField label="Số điện thoại" value={phone} onChangeText={setPhone} />
      <TextField label="Bác sĩ" value={doctor} onChangeText={setDoctor} />
      <TextField label="Bệnh nền (phẩy)" value={conditions} onChangeText={setConditions} />
      <PrimaryButton
        label="Lưu hồ sơ"
        disabled={!name.trim() || pending}
        loading={pending}
        onPress={() =>
          onSubmit({
            name: name.trim(),
            age: age ? Number(age) : null,
            relation: relation.trim() || null,
            phone: phone.trim() || null,
            doctor: doctor.trim() || null,
            conditions: conditions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
    </Card>
  );
}

function AddVitalForm({
  onSubmit,
  pending,
}: {
  onSubmit: (v: { kind: string; title: string; value?: string }) => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState("blood_pressure");
  const [title, setTitle] = useState("Huyết áp");
  const [value, setValue] = useState("");

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label="Loại (mã)" value={kind} onChangeText={setKind} />
      <TextField label="Tiêu đề" value={title} onChangeText={setTitle} />
      <TextField label="Giá trị" value={value} onChangeText={setValue} placeholder="120/80" />
      <PrimaryButton
        label="Lưu chỉ số"
        disabled={!title.trim() || pending}
        loading={pending}
        onPress={() => onSubmit({ kind, title: title.trim(), value: value.trim() || undefined })}
      />
    </Card>
  );
}

function AddMedForm({
  onSubmit,
  pending,
}: {
  onSubmit: (m: { medicine: string; dosage?: string; time_of_day?: string }) => void;
  pending: boolean;
}) {
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label="Tên thuốc" value={medicine} onChangeText={setMedicine} />
      <TextField label="Liều" value={dosage} onChangeText={setDosage} />
      <TimeField label="Giờ uống" value={time} onChange={setTime} />
      <PrimaryButton
        label="Lưu nhắc thuốc"
        disabled={!medicine.trim() || pending}
        loading={pending}
        onPress={() =>
          onSubmit({
            medicine: medicine.trim(),
            dosage: dosage.trim() || undefined,
            time_of_day: time || undefined,
          })
        }
      />
    </Card>
  );
}

