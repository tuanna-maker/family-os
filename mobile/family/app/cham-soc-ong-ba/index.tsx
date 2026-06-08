import { useEffect, useMemo, useState } from "react";
import {
  
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { appAlert } from "@mobile/utils/alert";
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
import { useI18n } from "@mobile/i18n/useI18n";
import { formatRelativeAgo, formatTime } from "@mobile/i18n/format";

const actKindStyle = (c: ReturnType<typeof useTheme>["colors"], kind: ActivityRow["kind"]) => {
  if (kind === "med") return { bg: c.tintGreen, fg: c.success };
  if (kind === "vital") return { bg: c.tintOrange, fg: c.warning };
  if (kind === "check") return { bg: c.tintBlue, fg: c.brand };
  return { bg: c.tintPink, fg: c.pink };
};

function safeStatusLabel(status: "ok" | "warn" | "alert", ec: ReturnType<typeof useI18n>["s"]["elderlyCare"]) {
  if (status === "ok") return ec.statusOk;
  if (status === "warn") return ec.statusWarn;
  return ec.statusAlert;
}

export default function ChamSocOngBaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { familyId } = useFamilyContext();
  const { user } = useAuth();
  const { locale, s } = useI18n();
  const ec = s.elderlyCare;
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
    const byId = Object.fromEntries(slots.map((slot) => [slot.id, slot]));
    const contactLabels = ec.contacts;
    return emergencyContacts.map((c) => {
      const label =
        c.kind === "elder"
          ? contactLabels.elder
          : c.kind === "family"
            ? contactLabels.family
            : c.kind === "security"
              ? contactLabels.security
              : contactLabels.sos;
      if (c.kind === "sos") return { ...c, label };
      const slot = byId[c.kind];
      if (!slot) return { ...c, label };
      return { ...c, label, name: slot.name, phone: slot.phone };
    });
  }, [contactsQ.data, ec.contacts]);

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
      toast.success(s.common.profileAdded);
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
      setShowAddProfile(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delProfile = useMutation({
    mutationFn: deleteElderlyProfile,
    onSuccess: () => {
      toast.success(s.common.profileDeleted);
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
      toast.success(ec.safeCheckDone(safeStatusLabel(vars.status, ec)));
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
      toast.success(s.common.medicineTaken);
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
      toast.success(s.common.medicineAdded);
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
        author_name: user?.email ?? s.common.you,
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
      toast.success(s.common.profileSaved);
      setShowEditProfile(false);
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addVitalMut = useMutation({
    mutationFn: addVital,
    onSuccess: () => {
      toast.success(s.common.vitalSaved);
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
        toast.success(s.common.sosSent);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : s.common.sosFailed);
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
      <PageHeader eyebrow={s.common.familyCore} title={ec.title} back="/(tabs)/gia-dinh" />
      <Text style={styles.pageSub}>{ec.pageSub}</Text>

      {profilesQ.isLoading && <LoadingState />}

      {!profilesQ.isLoading && profiles.length === 0 && (
        <>
          <EmptyState
            title={ec.noProfile}
            description={ec.noProfileDesc}
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
                <Text style={styles.chipAddText}>{s.common.add}</Text>
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
                        <Text style={styles.muted}> · {s.members.years(profile.age)}</Text>
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
                      <Text style={styles.editLink}>{s.common.edit}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        appAlert(ec.deleteProfile, profile.name, [
                          { text: s.common.cancel, style: "cancel" },
                          { text: s.common.delete, style: "destructive", onPress: () => delProfile.mutate({ id: profile.id }) },
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
                title={ec.quickContact}
                subtitle={ec.quickContactSub}
                action={
                  <Pressable onPress={() => router.push("/lien-he")}>
                    <Text style={styles.linkAction}>{ec.editPhone}</Text>
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
                title={medsView === "day" ? ec.medicineToday : ec.medicineWeek}
                subtitle={
                  medsView === "day"
                    ? ec.medsTakenToday(takenCount, meds.length, profile.name)
                    : ec.medsWeekSub(profile.name)
                }
                onAction={() => setShowAddMed((s) => !s)}
                actionLabel={s.common.add}
              />
              <View style={styles.medsToggleRow}>
                {(["day", "week"] as const).map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.medsToggle, medsView === v && styles.medsToggleActive]}
                    onPress={() => setMedsView(v)}
                  >
                    <Text style={[styles.medsToggleText, medsView === v && styles.medsToggleTextActive]}>
                      {v === "day" ? s.common.dayView : s.common.weekView}
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
                  <Text style={styles.emptyMed}>{ec.noMedicineHint}</Text>
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
                        {m.taken_today && m.taken_at ? ec.takenAt(formatTime(m.taken_at, locale)) : ""}
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
                        {m.taken_today ? s.common.taken : s.common.confirmTaken}
                      </Text>
                    </Pressable>
                  </Card>
                ))
              )}

              {vitals.length > 0 && (
                <>
                  <SectionHeader title={ec.recentVitals} subtitle={profile.name} />
                  <View style={styles.vitalGrid}>
                    {vitals.map((v) => (
                      <Card key={v.id} style={styles.vitalCard}>
                        <Text style={styles.muted}>{v.title}</Text>
                        <Text style={styles.vitalVal}>{v.value ?? "—"}</Text>
                        <Text style={styles.muted}>{formatRelativeAgo(v.recorded_at, locale)}</Text>
                      </Card>
                    ))}
                  </View>
                </>
              )}

              <SectionHeader
                title={ec.vitals}
                onAction={() => setShowVital((v) => !v)}
                actionLabel={showVital ? s.common.close : s.common.recordNew}
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

              <SectionHeader title={ec.careNotes} subtitle={ec.careNotesSub} />
              <Card>
                <View style={styles.noteRow}>
                  <TextInput
                    style={styles.noteInput}
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder={ec.careNotesPlaceholder}
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
                  <Text style={[styles.muted, { textAlign: "center", paddingVertical: 12 }]}>{ec.noNotes}</Text>
                ) : null}
                {(notesQ.data ?? []).map((n) => (
                  <View key={n.id} style={styles.noteItem}>
                    <NotebookPen color={themeColors.brand} size={14} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.noteAuthor}>{n.author_name}</Text>
                        <Text style={styles.noteTime}>{formatRelativeAgo(n.created_at, locale)}</Text>
                      </View>
                      <Text style={styles.noteBody}>{n.content}</Text>
                    </View>
                  </View>
                ))}
              </Card>

              <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <SectionHeader title={ec.activityLog} subtitle={ec.activityLogSub} />
                </View>
                <Pressable style={styles.journalLink} onPress={() => router.push("/cham-soc-ong-ba/nhat-ky")}>
                  <Text style={styles.journalText}>{ec.journalLink}</Text>
                  <ChevronRight color={themeColors.brand} size={16} />
                </Pressable>
              </View>

              {activity.length === 0 ? (
                <Card>
                  <Text style={styles.emptyMed}>{ec.noActivity}</Text>
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
                            <Text style={styles.actTime}>{formatRelativeAgo(a.at, locale)}</Text>
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
                    <Text style={styles.doctorLabel}>{ec.attendingDoctor}</Text>
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
  const { s } = useI18n();
  const ec = s.elderlyCare;
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [conditions, setConditions] = useState("");

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={formStyles.formTitle}>{ec.newProfile}</Text>
      <TextField label={s.common.name} value={name} onChangeText={setName} placeholder={ec.placeholderName} />
      <TextField label={s.common.relation} value={relation} onChangeText={setRelation} />
      <TextField label={s.common.age} value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextField label={s.common.phone} value={phone} onChangeText={setPhone} />
      <TextField label={s.common.conditions} value={conditions} onChangeText={setConditions} />
      <PrimaryButton
        label={s.common.saveProfile}
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
  const { s } = useI18n();
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : "");
  const [relation, setRelation] = useState(profile.relation ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [doctor, setDoctor] = useState(profile.doctor ?? "");
  const [conditions, setConditions] = useState(profile.conditions.join(", "));

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label={s.common.name} value={name} onChangeText={setName} />
      <TextField label={s.common.relation} value={relation} onChangeText={setRelation} />
      <TextField label={s.common.age} value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextField label={s.common.phone} value={phone} onChangeText={setPhone} />
      <TextField label={s.common.doctor} value={doctor} onChangeText={setDoctor} />
      <TextField label={s.common.conditions} value={conditions} onChangeText={setConditions} />
      <PrimaryButton
        label={s.common.saveProfile}
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
  const { s } = useI18n();
  const ec = s.elderlyCare;
  const [kind, setKind] = useState("blood_pressure");
  const [title, setTitle] = useState<string>(ec.defaultVitalTitle);
  const [value, setValue] = useState("");

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label={s.common.type} value={kind} onChangeText={setKind} />
      <TextField label={s.common.title} value={title} onChangeText={setTitle} />
      <TextField label={s.common.value} value={value} onChangeText={setValue} placeholder={ec.placeholderVital} />
      <PrimaryButton
        label={s.common.saveVital}
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
  const { s } = useI18n();
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label={s.common.medicine} value={medicine} onChangeText={setMedicine} />
      <TextField label={s.common.dosage} value={dosage} onChangeText={setDosage} />
      <TimeField label={s.common.medicineTime} value={time} onChange={setTime} />
      <PrimaryButton
        label={s.common.saveMedicine}
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

