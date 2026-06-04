import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  NotebookPen,
  Phone,
  Pill,
  Plus,
  Send,
  ShieldAlert,
  Siren,
  Trash2,
  Users,
} from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { EmptyState, LoadingState } from "@mobile/components/states";
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
  type ElderlyProfileRow,
} from "@mobile/api/elderly-care";
import { createSecurityRequest } from "@mobile/api/security";
import { emergencyContacts } from "@mobile/constants/emergency-contacts";
import { loadFamilyContacts } from "@mobile/lib/family-contacts";
import { supabase } from "@shared/supabase/get-client";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

const statusLabel: Record<string, string> = { ok: "Ổn định", warn: "Lưu ý", alert: "Cảnh báo" };
const statusBg: Record<string, string> = {
  ok: colors.tintGreen,
  warn: colors.tintOrange,
  alert: colors.tintOrange,
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function ChamSocOngBaScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [showVital, setShowVital] = useState(false);
  const [safeNote, setSafeNote] = useState("");
  const [pickedStatus, setPickedStatus] = useState<"ok" | "warn" | "alert">("ok");
  const [noteInput, setNoteInput] = useState("");

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

  const weekQ = useQuery({
    queryKey: ["elderly-meds-week", familyId, profile?.name],
    queryFn: () => listMedicineWeek({ familyId: familyId!, memberName: profile!.name, days: 7 }),
    enabled: !!familyId && !!profile && showWeek,
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
    mutationFn: () =>
      confirmSafeCheck({
        elderly_id: profile!.id,
        family_id: profile!.family_id,
        status: pickedStatus,
        note: safeNote.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`Safe Check: ${statusLabel[pickedStatus]}`);
      setSafeNote("");
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
      qc.invalidateQueries({ queryKey: ["safe-checks", profile?.id] });
      qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const takenMut = useMutation({
    mutationFn: markMedicineTaken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMut = useMutation({
    mutationFn: undoMedicineTaken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] }),
  });

  const createMed = useMutation({
    mutationFn: createMedicineReminder,
    onSuccess: () => {
      toast.success("Đã thêm nhắc thuốc");
      qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] });
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

  const meds = medsQ.data ?? [];
  const takenCount = meds.filter((m) => m.taken_today).length;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Gia đình" title="Chăm sóc ông bà" back="/(tabs)/gia-dinh" />

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
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
                <Plus color={colors.muted} size={16} />
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
              <Card>
                <View style={styles.profileRow}>
                  <Text style={styles.avatarBig}>{profile.avatar ?? "👵"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>
                      {profile.name}
                      {profile.age != null ? ` · ${profile.age} tuổi` : ""}
                    </Text>
                    {profile.relation ? <Text style={styles.muted}>{profile.relation}</Text> : null}
                  </View>
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
                    <Trash2 color={colors.emergency} size={18} />
                  </Pressable>
                </View>

                {showEditProfile && (
                  <EditProfileForm
                    profile={profile}
                    pending={updateProfileMut.isPending}
                    onSubmit={(p) => updateProfileMut.mutate({ id: profile.id, ...p })}
                  />
                )}

                <View style={[styles.safeBanner, { backgroundColor: statusBg[profile.safe_status] }]}>
                  <CheckCircle2 color={colors.foreground} size={22} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.safeTitle}>Safe Check · {statusLabel[profile.safe_status]}</Text>
                    <Text style={styles.muted} numberOfLines={2}>
                      {profile.safe_note ?? "Chưa có ghi chú"}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {profile.safe_last_at ? fmtRelative(profile.safe_last_at) : "Chưa xác nhận"}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  {(["ok", "warn", "alert"] as const).map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.statusChip, pickedStatus === s && styles.statusChipActive]}
                      onPress={() => setPickedStatus(s)}
                    >
                      <Text style={styles.statusChipText}>{statusLabel[s]}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextField label="Ghi chú Safe Check" value={safeNote} onChangeText={setSafeNote} multiline />
                <PrimaryButton
                  label="Xác nhận Safe Check"
                  onPress={() => safeMut.mutate()}
                  loading={safeMut.isPending}
                />
              </Card>

              <Pressable style={styles.journalLink} onPress={() => router.push("/lien-he")}>
                <Phone color={colors.brand} size={18} />
                <Text style={styles.journalText}>Chỉnh sửa người liên hệ khẩn cấp</Text>
                <ChevronRight color={colors.muted} size={18} />
              </Pressable>

              <SectionHeader title="Liên hệ nhanh" />
              <View style={styles.contactGrid}>
                {quickContacts.map((c) => {
                  const isSos = c.kind === "sos";
                  const phone = c.kind === "elder" && profile.phone ? profile.phone : c.phone;
                  const Icon =
                    c.kind === "elder" ? Phone : c.kind === "family" ? Users : c.kind === "security" ? ShieldAlert : Siren;
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.contactBtn, isSos && styles.contactSos]}
                      onPress={() => handleCall(c.label, phone, isSos)}
                    >
                      <Icon color={isSos ? colors.white : colors.foreground} size={22} />
                      <Text style={[styles.contactLabel, isSos && { color: colors.white }]}>{c.label}</Text>
                      <Text style={[styles.contactSub, isSos && { color: colors.white }]} numberOfLines={1}>
                        {c.kind === "elder" ? profile.name : c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <SectionHeader
                title="Nhắc thuốc hôm nay"
                subtitle={`${takenCount}/${meds.length} đã uống`}
                onAction={() => setShowAddMed((s) => !s)}
                actionLabel="Thêm"
              />
              <Pressable style={styles.weekToggle} onPress={() => setShowWeek((s) => !s)}>
                <Text style={styles.weekToggleText}>
                  {showWeek ? "Ẩn lịch 7 ngày" : "Xem lịch uống thuốc 7 ngày"}
                </Text>
              </Pressable>
              {showWeek && (weekQ.data ?? []).length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={styles.weekRow}>
                    {(weekQ.data ?? []).map((day) => {
                      const taken = day.entries.filter((e) => e.taken).length;
                      return (
                        <Card key={day.date} style={styles.weekCard}>
                          <Text style={styles.mutedSmall}>{day.date.slice(5)}</Text>
                          <Text style={styles.weekStat}>
                            {taken}/{day.entries.length}
                          </Text>
                        </Card>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              {showAddMed && profile && (
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
              {meds.length === 0 ? (
                <Card><Text style={styles.muted}>Chưa có nhắc thuốc.</Text></Card>
              ) : (
                meds.map((m) => (
                  <Card key={m.id} style={styles.medRow}>
                    <Pill color={m.taken_today ? colors.success : colors.warning} size={20} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medTitle, m.taken_today && styles.medDone]}>{m.medicine}</Text>
                      <Text style={styles.muted}>{m.time_of_day ?? "—"}</Text>
                    </View>
                    <Pressable
                      style={[styles.medBtn, m.taken_today && styles.medBtnDone]}
                      onPress={() =>
                        m.taken_today
                          ? undoMut.mutate({ reminder_id: m.id })
                          : takenMut.mutate({ reminder_id: m.id, family_id: familyId! })
                      }
                    >
                      <Text style={styles.medBtnText}>{m.taken_today ? "Hoàn tác" : "Đã uống"}</Text>
                    </Pressable>
                  </Card>
                ))
              )}

              <SectionHeader
                title="Chỉ số sức khỏe"
                onAction={() => setShowVital((s) => !s)}
                actionLabel={showVital ? "Đóng" : "Ghi mới"}
              />
              {(vitalsQ.data ?? []).length > 0 && (
                <View style={styles.vitalGrid}>
                  {(vitalsQ.data ?? []).slice(0, 4).map((v) => (
                    <Card key={v.id} style={styles.vitalCard}>
                      <Text style={styles.mutedSmall}>{v.title}</Text>
                      <Text style={styles.vitalVal}>{v.value ?? "—"}</Text>
                    </Card>
                  ))}
                </View>
              )}
              {showVital && profile && (
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

              <SectionHeader title="Ghi chú chăm sóc" />
              <Card>
                <View style={styles.noteRow}>
                  <TextInput
                    style={styles.noteInput}
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder="Ghi nhanh về tình trạng…"
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable
                    style={styles.sendBtn}
                    disabled={!noteInput.trim() || addNoteMut.isPending}
                    onPress={() => addNoteMut.mutate()}
                  >
                    <Send color={colors.white} size={18} />
                  </Pressable>
                </View>
                {(notesQ.data ?? []).map((n) => (
                  <View key={n.id} style={styles.noteItem}>
                    <NotebookPen color={colors.brand} size={14} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteAuthor}>{n.author_name}</Text>
                      <Text style={styles.noteBody}>{n.content}</Text>
                    </View>
                  </View>
                ))}
              </Card>

              <Pressable style={styles.journalLink} onPress={() => router.push("/cham-soc-ong-ba/nhat-ky")}>
                <Activity color={colors.brand} size={18} />
                <Text style={styles.journalText}>Nhật ký hoạt động 7/30 ngày</Text>
                <ChevronRight color={colors.muted} size={18} />
              </Pressable>

              {(actQ.data ?? []).slice(0, 5).map((a) => (
                <Card key={a.id} style={styles.actRow}>
                  <Text style={styles.actTitle}>{a.title}</Text>
                  <Text style={styles.mutedSmall}>{fmtRelative(a.at)}</Text>
                </Card>
              ))}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </Screen>
  );
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
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [conditions, setConditions] = useState("");

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={styles.formTitle}>Hồ sơ mới</Text>
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
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : "");
  const [relation, setRelation] = useState(profile.relation ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [doctor, setDoctor] = useState(profile.doctor ?? "");

  return (
    <Card style={{ marginBottom: 12 }}>
      <TextField label="Tên" value={name} onChangeText={setName} />
      <TextField label="Mối quan hệ" value={relation} onChangeText={setRelation} />
      <TextField label="Tuổi" value={age} onChangeText={setAge} keyboardType="numeric" />
      <TextField label="Số điện thoại" value={phone} onChangeText={setPhone} />
      <TextField label="Bác sĩ" value={doctor} onChangeText={setDoctor} />
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
      <TextField label="Giờ (HH:MM)" value={time} onChangeText={setTime} />
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

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  chipText: { fontWeight: "600", color: colors.foreground },
  chipTextActive: { color: colors.white },
  chipAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.cardBorder,
  },
  chipAddText: { color: colors.muted, fontWeight: "600" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatarBig: { fontSize: 40 },
  profileName: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  mutedSmall: { fontSize: 10, color: colors.muted, marginTop: 2 },
  safeBanner: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.lg, marginBottom: 12 },
  safeTitle: { fontWeight: "700", color: colors.foreground },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statusChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  statusChipActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  statusChipText: { fontSize: 11, fontWeight: "700", color: colors.foreground },
  contactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  contactBtn: {
    width: "47%",
    minHeight: 96,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.tintBlue,
    justifyContent: "space-between",
  },
  contactSos: { backgroundColor: colors.emergency },
  contactLabel: { fontWeight: "800", fontSize: 14, color: colors.foreground },
  contactSub: { fontSize: 11, color: colors.muted },
  medRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  medTitle: { fontWeight: "700", color: colors.foreground },
  medDone: { textDecorationLine: "line-through", color: colors.muted },
  medBtn: { backgroundColor: colors.brandDeep, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md },
  medBtnDone: { backgroundColor: colors.mutedBg },
  medBtnText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  vitalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  vitalCard: { width: "47%", padding: 12 },
  vitalVal: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  noteRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  noteItem: { flexDirection: "row", gap: 8, marginBottom: 10 },
  noteAuthor: { fontSize: 11, fontWeight: "700", color: colors.foreground },
  noteBody: { fontSize: 13, color: colors.muted, marginTop: 2 },
  journalLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.tintBlue,
    borderRadius: radius.lg,
    marginVertical: 12,
  },
  journalText: { flex: 1, fontWeight: "700", color: colors.brand },
  actRow: { marginBottom: 6 },
  actTitle: { fontWeight: "600", color: colors.foreground },
  formTitle: { fontWeight: "700", marginBottom: 8, color: colors.foreground },
  editLink: { color: colors.brand, fontWeight: "700", fontSize: 13, marginRight: 8 },
  weekToggle: { marginBottom: 10 },
  weekToggleText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  weekRow: { flexDirection: "row", gap: 8 },
  weekCard: { minWidth: 72, padding: 10, alignItems: "center" },
  weekStat: { fontSize: 16, fontWeight: "800", color: colors.foreground, marginTop: 4 },
});
