import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Phone,
  Stethoscope,
  ShieldAlert,
  Siren,
  Users,
  CheckCircle2,
  Pill,
  Activity,
  NotebookPen,
  Send,
  MapPin,
  Plus,
  Loader2,
} from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listElderlyProfiles,
  createElderlyProfile,
  confirmSafeCheck,
  listSafeChecks,
  listMedicineReminders,
  listMedicineWeek,
  createMedicineReminder,
  markMedicineTaken,
  undoMedicineTaken,
  listCareNotes,
  addCareNote,
  listVitals,
  listElderlyActivity,
  type ElderlyProfileRow,
  type SafeCheckRow,
  type MedicineWeekDay,
} from "@/api/elderly-care";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { useAuth } from "@shared/ui/hooks/use-auth";
import { useFamilyContacts, familyOptions } from "@/features/family-core/contacts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@shared/ui/ui/dialog";
import type { MedicineReminderRow } from "@/api/elderly-care";

import { createSecurityRequest } from "@/api/security";
import { emergencyContacts, type EmergencyContact } from "@/features/family-core/elderly-care";
import { cn } from "@shared/utils";
import { toast } from "sonner";
import { requireAuth } from "@/api/require-auth";

import { getMyContext } from "@/api/auth";

const CTX_STALE_MS = 5 * 60_000;
const DATA_STALE_MS = 60_000;

export const Route = createFileRoute("/cham-soc-ong-ba")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [
      { title: "Chăm sóc ông bà — STOS Life" },
      {
        name: "description",
        content:
          "Theo dõi sức khoẻ, nhắc thuốc, Safe Check và liên hệ khẩn cấp cho ông bà — đơn giản, dễ dùng cho cả gia đình.",
      },
    ],
  }),
  component: ElderlyCarePage,
});

const statusTone: Record<string, string> = {
  ok: "bg-tint-green text-success",
  warn: "bg-tint-orange text-warning",
  alert: "bg-tint-red text-emergency",
};

const statusLabel: Record<string, string> = {
  ok: "Ổn định",
  warn: "Lưu ý",
  alert: "Cảnh báo",
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước · ${fmtTime(iso)}`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

function ElderlyCarePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const [confirmMed, setConfirmMed] = useState<MedicineReminderRow | null>(null);
  const [confirmTime, setConfirmTime] = useState<string>("");
  const [confirmNote, setConfirmNote] = useState<string>("");

  if (!session && !famLoading) {
    // chuyển hướng đăng nhập
    navigate({ to: "/login", search: { redirect: "/cham-soc-ong-ba" } });
  }

  // ============ QUERIES ============
    const profilesQ = useQuery({
    queryKey: ["elderly-profiles", familyId],
    queryFn: () => listElderlyProfiles({ familyId: familyId! }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });

  const profiles = profilesQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const profile: ElderlyProfileRow | null = useMemo(() => {
    if (profiles.length === 0) return null;
    return profiles.find((p) => p.id === selectedId) ?? profiles[0];
  }, [profiles, selectedId]);

    const medsQ = useQuery({
    queryKey: ["elderly-meds", familyId, profile?.name],
    queryFn: () =>
      listMedicineReminders({ familyId: familyId!, memberName: profile!.name }),
    enabled: !!familyId && !!profile,
    staleTime: DATA_STALE_MS,
  });

    const medsWeekQ = useQuery({
    queryKey: ["elderly-meds-week", familyId, profile?.name],
    queryFn: () =>
      listMedicineWeek({ familyId: familyId!, memberName: profile!.name, days: 7 }),
    enabled: !!familyId && !!profile,
    staleTime: DATA_STALE_MS,
  });



    const notesQ = useQuery({
    queryKey: ["elderly-notes", profile?.id],
    queryFn: () => listCareNotes({ elderlyId: profile!.id }),
    enabled: !!profile,
    staleTime: DATA_STALE_MS,
  });

    const vitalsQ = useQuery({
    queryKey: ["elderly-vitals", familyId, profile?.name],
    queryFn: () =>
      listVitals({ familyId: familyId!, memberName: profile!.name }),
    enabled: !!familyId && !!profile,
    staleTime: DATA_STALE_MS,
  });

    const actQ = useQuery({
    queryKey: ["elderly-activity", profile?.id],
    queryFn: () =>
      listElderlyActivity({ elderlyId: profile!.id, familyId: familyId! }),
    enabled: !!profile && !!familyId,
    staleTime: DATA_STALE_MS,
  });

    const safeChecksQ = useQuery({
    queryKey: ["safe-checks", profile?.id],
    queryFn: () => listSafeChecks({ elderlyId: profile!.id }),
    enabled: !!profile,
    staleTime: DATA_STALE_MS,
  });


  // Realtime: cập nhật ngay khi có người khác xác nhận Safe Check
  useEffect(() => {
    if (!profile?.id) return;
    const ch = supabase
      .channel(`safe_checks:${profile.id}`)
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
        () => {
          qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
        },
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
      supabase.removeChannel(ch);
    };
  }, [profile?.id, profile?.name, familyId, qc]);

  // ============ MUTATIONS ============
  const createProfile = useMutation({
    mutationFn: createElderlyProfile,
    onSuccess: () => {
      toast.success("Đã thêm hồ sơ");
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
    },
    onError: (e: Error) => toast.error("Không thêm được", { description: e.message }),
  });

  const [safeNoteDraft, setSafeNoteDraft] = useState("");
    const safeMut = useMutation({
    mutationFn: (input: { status: "ok" | "warn" | "alert"; note?: string }) =>
      confirmSafeCheck({
          elderly_id: profile!.id,
          family_id: profile!.family_id,
          status: input.status,
          note: input.note
    }),
    onSuccess: (_d, vars) => {
      toast.success(`${profile?.name}: ${statusLabel[vars.status]}`);
      setSafeNoteDraft("");
      qc.invalidateQueries({ queryKey: ["elderly-profiles", familyId] });
      qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
      qc.invalidateQueries({ queryKey: ["safe-checks", profile?.id] });
    },
    onError: (e: Error) => toast.error("Lỗi Safe Check", { description: e.message }),
  });

  const takenMut = useMutation({
    mutationFn: markMedicineTaken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] });
      qc.invalidateQueries({ queryKey: ["elderly-meds-week", familyId, profile?.name] });
    },
    onError: (e: Error) => toast.error("Không lưu được", { description: e.message }),
  });
  const undoMut = useMutation({
    mutationFn: undoMedicineTaken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] });
      qc.invalidateQueries({ queryKey: ["elderly-meds-week", familyId, profile?.name] });
    },
  });

  const createMed = useMutation({
    mutationFn: createMedicineReminder,
    onSuccess: () => {
      toast.success("Đã thêm nhắc thuốc");
      qc.invalidateQueries({ queryKey: ["elderly-meds", familyId, profile?.name] });
    },
    onError: (e: Error) => toast.error("Không thêm được", { description: e.message }),
  });

  const addNoteMut = useMutation({
    mutationFn: addCareNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elderly-notes", profile?.id] });
      qc.invalidateQueries({ queryKey: ["elderly-activity", profile?.id] });
    },
    onError: (e: Error) => toast.error("Không thêm ghi chú", { description: e.message }),
  });

  // ============ LIÊN HỆ ============
  const { contacts: managedContacts } = useFamilyContacts(familyOptions[0].id);
    const qc2 = qc;

  const mergedContacts = useMemo<EmergencyContact[]>(() => {
    return emergencyContacts.map((c) => {
      if (c.kind === "sos") return c;
      const m = managedContacts.find((mc) => mc.id === c.kind);
      return m ? { ...c, name: m.name, phone: m.phone } : c;
    });
  }, [managedContacts]);

  async function handleCall(label: string, phone: string, isSos = false) {
    if (isSos) {
      if (session) {
        try {
          await createSecurityRequest({
            request_type: "sos",
            elderly_id: profile?.id ?? null,
            apartment: profile?.name ?? null,
          });
          await qc2.invalidateQueries({ queryKey: ["security-requests"] });
          toast.error(`SOS — Đã gửi tới bảo an`, {
            description: `Theo dõi trạng thái tại trang Bảo an. Vẫn đang gọi ${label}.`,
            action: {
              label: "Xem",
              onClick: () => {
                if (typeof window !== "undefined") window.location.href = "/bao-an";
              },
            },
          });
        } catch (e) {
          toast.error("Không gửi được SOS tới bảo an", { description: (e as Error).message });
        }
      } else {
        toast.error(`SOS — Đang gọi ${label}`, { description: phone });
      }
    } else {
      toast.success(`Đang gọi ${label}`, { description: phone });
    }
    if (typeof window !== "undefined") window.location.href = `tel:${phone}`;
  }

  // ============ HANDLERS ============
  const [noteInput, setNoteInput] = useState("");
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [medsView, setMedsView] = useState<"day" | "week">("day");
  const weekDays: MedicineWeekDay[] = medsWeekQ.data ?? [];

  const meds = medsQ.data ?? [];
  const notes = notesQ.data ?? [];
  const vitals = vitalsQ.data ?? [];
  const activity = actQ.data ?? [];
  const takenCount = meds.filter((m) => m.taken_today).length;

  // ============ RENDER ============
  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Chăm sóc ông bà"
        subtitle="Quan tâm mỗi ngày, an tâm dài lâu"
        emoji="👵"
      />

      {famLoading || profilesQ.isLoading ? (
        <div className="px-4 mt-6 grid place-items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyProfilesCard
          onAdd={(p) =>
            createProfile.mutate({ family_id: familyId!, ...p })
          }
          pending={createProfile.isPending}
        />
      ) : (
        <>
          {/* Chọn ông/bà */}
          <section className="px-4 mt-2">
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {profiles.map((p) => {
                const active = p.id === (profile?.id ?? "");
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-2 rounded-2xl px-3 py-2 border transition",
                      active
                        ? "bg-brand text-white border-brand"
                        : "bg-card border-border text-foreground",
                    )}
                  >
                    <span className="text-xl">{p.avatar ?? "👵"}</span>
                    <span className="text-sm font-semibold">{p.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowAddProfile((s) => !s)}
                className="shrink-0 flex items-center gap-1.5 rounded-2xl px-3 py-2 border border-dashed border-border text-sm text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm
              </button>
            </div>
            {showAddProfile && (
              <div className="mt-3">
                <AddProfileForm
                  pending={createProfile.isPending}
                  onSubmit={(p) => {
                    createProfile.mutate(
                      { data: { family_id: familyId!, ...p } },
                      { onSuccess: () => setShowAddProfile(false) },
                    );
                  }}
                />
              </div>
            )}
          </section>

          {profile && (
            <>
              {/* Hồ sơ + Safe Check */}
              <section className="px-4 mt-3">
                <RoundedCard className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-tint-pink grid place-items-center text-3xl shrink-0">
                      {profile.avatar ?? "👵"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold leading-tight">
                        {profile.name}
                        {profile.age != null && (
                          <span className="text-muted-foreground font-medium text-sm">
                            {" "}
                            · {profile.age} tuổi
                          </span>
                        )}
                      </p>
                      {profile.relation && (
                        <p className="text-xs text-muted-foreground">{profile.relation}</p>
                      )}
                      {profile.address && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {profile.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {profile.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.conditions.map((c) => (
                        <span
                          key={c}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-tint-red text-emergency font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Safe Check */}
                  <SafeCheckPanel
                    profile={profile}
                    history={safeChecksQ.data ?? []}
                    historyLoading={safeChecksQ.isLoading}
                    isPending={safeMut.isPending}
                    note={safeNoteDraft}
                    onNoteChange={setSafeNoteDraft}
                    onConfirm={(status) =>
                      safeMut.mutate({ status, note: safeNoteDraft.trim() || undefined })
                    }
                  />

                </RoundedCard>
              </section>

              {/* Nút khẩn cấp lớn */}
              <section className="px-4 mt-6">
                <SectionHeader
                  title="Liên hệ nhanh"
                  subtitle="Nút lớn — dễ bấm cho mọi người"
                  action={
                    <Link to="/lien-he" className="text-xs font-semibold text-brand">
                      Sửa số
                    </Link>
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  {mergedContacts.map((c) => {
                    const isSos = c.kind === "sos";
                    const Icon =
                      c.kind === "elder"
                        ? Phone
                        : c.kind === "family"
                          ? Users
                          : c.kind === "security"
                            ? ShieldAlert
                            : Siren;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleCall(c.label, c.phone, isSos)}
                        className={cn(
                          "min-h-[104px] rounded-3xl p-4 flex flex-col items-start justify-between text-left transition active:scale-[0.98] shadow-[var(--shadow-soft)]",
                          isSos
                            ? "bg-emergency text-white"
                            : c.kind === "security"
                              ? "bg-tint-orange text-warning"
                              : c.kind === "family"
                                ? "bg-tint-blue text-brand"
                                : "bg-tint-green text-success",
                        )}
                      >
                        <div className="h-10 w-10 rounded-2xl bg-background/70 grid place-items-center">
                          <Icon className={cn("h-5 w-5", isSos ? "text-emergency" : "")} />
                        </div>
                        <div>
                          <p className="text-base font-bold leading-tight">{c.label}</p>
                          <p className="text-xs opacity-80 mt-0.5">{c.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Nhắc thuốc */}
              <section className="px-4 mt-6">
                <SectionHeader
                  title={medsView === "day" ? "Nhắc thuốc hôm nay" : "Lịch thuốc 7 ngày"}
                  subtitle={
                    medsView === "day"
                      ? `${takenCount}/${meds.length} đã uống · ${profile.name}`
                      : `${profile.name} · tự cập nhật`
                  }
                  action={
                    <button
                      onClick={() => setShowAddMed((s) => !s)}
                      className="text-xs font-semibold text-brand flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Thêm
                    </button>
                  }
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(["day", "week"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setMedsView(v)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold border transition",
                        medsView === v
                          ? "bg-brand text-white border-brand"
                          : "bg-card border-border text-foreground",
                      )}
                    >
                      {v === "day" ? "Theo ngày" : "Theo tuần"}
                    </button>
                  ))}
                </div>
                {showAddMed && (
                  <div className="mb-3">
                    <AddMedForm
                      pending={createMed.isPending}
                      onSubmit={(m) =>
                        createMed.mutate(
                          {
                            data: {
                              family_id: familyId!,
                              member_name: profile.name,
                              ...m,
                            },
                          },
                          { onSuccess: () => setShowAddMed(false) },
                        )
                      }
                    />
                  </div>
                )}
                {medsView === "week" ? (
                  <MedicineWeekView
                    days={weekDays}
                    isLoading={medsWeekQ.isLoading}
                    onMark={(reminderId) => {
                      const now = new Date();
                      const hh = String(now.getHours()).padStart(2, "0");
                      const mm = String(now.getMinutes()).padStart(2, "0");
                      takenMut.mutate({
                        reminder_id: reminderId,
                        family_id: familyId!,
                        taken_at: new Date().toISOString(),
                        note: undefined,
                      });
                      // dummy use to keep tooling
                      void `${hh}:${mm}`;
                    }}
                    pending={takenMut.isPending}
                  />
                ) : medsQ.isLoading ? (
                  <RoundedCard className="grid place-items-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </RoundedCard>
                ) : meds.length === 0 ? (
                  <RoundedCard className="text-center text-sm text-muted-foreground py-6">
                    Chưa có nhắc thuốc — bấm <span className="font-semibold">Thêm</span> ở trên.
                  </RoundedCard>
                ) : (
                  <RoundedCard className="p-0 divide-y divide-border">
                    {meds.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-4">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl grid place-items-center shrink-0",
                            m.taken_today ? "bg-tint-green" : "bg-tint-orange",
                          )}
                        >
                          <Pill
                            className={cn(
                              "h-5 w-5",
                              m.taken_today ? "text-success" : "text-warning",
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-bold truncate",
                              m.taken_today && "line-through text-muted-foreground",
                            )}
                          >
                            {m.medicine}
                          </p>
                          {m.dosage && (
                            <p className="text-xs text-muted-foreground truncate">{m.dosage}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {m.time_of_day ?? "—"}
                            {m.taken_today && m.taken_at
                              ? ` · Đã uống lúc ${fmtTime(m.taken_at)}`
                              : ""}
                          </p>
                        </div>
                        <button
                          disabled={takenMut.isPending || undoMut.isPending}
                          onClick={() => {
                            if (m.taken_today) {
                              undoMut.mutate({ reminder_id: m.id });
                            } else {
                              const now = new Date();
                              const hh = String(now.getHours()).padStart(2, "0");
                              const mm = String(now.getMinutes()).padStart(2, "0");
                              setConfirmTime(`${hh}:${mm}`);
                              setConfirmNote("");
                              setConfirmMed(m);
                            }
                          }}
                          className={cn(
                            "text-xs font-bold rounded-xl px-3 py-2.5 min-w-[88px] disabled:opacity-60",
                            m.taken_today
                              ? "bg-muted text-muted-foreground"
                              : "bg-brand text-white",
                          )}
                        >
                          {m.taken_today ? "Đã uống" : "Xác nhận"}
                        </button>
                      </div>
                    ))}
                  </RoundedCard>
                )}
              </section>

              {/* Chỉ số sinh hiệu */}
              {vitals.length > 0 && (
                <section className="px-4 mt-6">
                  <SectionHeader title="Chỉ số gần đây" subtitle={profile.name} />
                  <div className="grid grid-cols-2 gap-3">
                    {vitals.map((v) => (
                      <RoundedCard key={v.id} className="p-4">
                        <p className="text-[11px] text-muted-foreground">{v.title}</p>
                        <p className="text-xl font-bold leading-tight mt-1">
                          {v.value ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {fmtRelative(v.recorded_at)}
                        </p>
                      </RoundedCard>
                    ))}
                  </div>
                </section>
              )}

              {/* Ghi chú chăm sóc */}
              <section className="px-4 mt-6">
                <SectionHeader title="Ghi chú chăm sóc" subtitle="Chia sẻ giữa các thành viên" />
                <RoundedCard className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && noteInput.trim()) {
                          addNoteMut.mutate(
                            {
                              data: {
                                elderly_id: profile.id,
                                family_id: profile.family_id,
                                content: noteInput.trim(),
                                author_name: session?.user?.email ?? "Bạn",
                              },
                            },
                            { onSuccess: () => setNoteInput("") },
                          );
                        }
                      }}
                      placeholder="Ghi nhanh về tình trạng của ông/bà..."
                      className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
                    />
                    <button
                      disabled={addNoteMut.isPending || !noteInput.trim()}
                      onClick={() => {
                        if (!noteInput.trim()) return;
                        addNoteMut.mutate(
                          {
                            data: {
                              elderly_id: profile.id,
                              family_id: profile.family_id,
                              content: noteInput.trim(),
                              author_name: session?.user?.email ?? "Bạn",
                            },
                          },
                          { onSuccess: () => setNoteInput("") },
                        );
                      }}
                      className="rounded-2xl bg-brand text-white px-4 grid place-items-center disabled:opacity-60"
                      aria-label="Thêm ghi chú"
                    >
                      {addNoteMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {notes.length === 0 && !notesQ.isLoading && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Chưa có ghi chú nào.
                      </p>
                    )}
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-2xl bg-muted/40 p-3">
                        <div className="flex items-center gap-2">
                          <NotebookPen className="h-3.5 w-3.5 text-brand" />
                          <p className="text-xs font-bold truncate">{n.author_name}</p>
                          <p className="text-[11px] text-muted-foreground ml-auto shrink-0">
                            {fmtRelative(n.created_at)}
                          </p>
                        </div>
                        <p className="text-sm mt-1.5 leading-snug">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </RoundedCard>
              </section>

              {/* Activity log */}
              <section className="px-4 mt-6">
                <div className="flex items-center justify-between mb-2">
                  <SectionHeader title="Nhật ký hoạt động" subtitle="7 ngày gần nhất" />
                  <Link
                    to="/cham-soc-ong-ba/nhat-ky"
                    className="text-xs font-medium text-primary shrink-0 ml-2"
                  >
                    Xem 7/30 ngày →
                  </Link>
                </div>
                {activity.length === 0 ? (
                  <RoundedCard className="text-center text-sm text-muted-foreground py-6">
                    Chưa có hoạt động.
                  </RoundedCard>
                ) : (
                  <RoundedCard className="p-0">
                    <ol className="relative">
                      {activity.map((a, idx) => (
                        <li key={a.id} className="flex gap-3 px-4 py-3.5 relative">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "h-9 w-9 rounded-2xl grid place-items-center shrink-0",
                                a.kind === "med"
                                  ? "bg-tint-green text-success"
                                  : a.kind === "vital"
                                    ? "bg-tint-orange text-warning"
                                    : a.kind === "check"
                                      ? "bg-tint-blue text-brand"
                                      : "bg-tint-pink text-pink",
                              )}
                            >
                              <Activity className="h-4 w-4" />
                            </div>
                            {idx < activity.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">{a.title}</p>
                              <p className="text-[11px] text-muted-foreground ml-auto shrink-0">
                                {fmtRelative(a.at)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {a.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </RoundedCard>
                )}
              </section>

              {/* Bác sĩ */}
              {profile.doctor && (
                <section className="px-4 mt-6">
                  <RoundedCard className="bg-tint-blue border-0 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-card grid place-items-center">
                      <Stethoscope className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-brand">
                        Bác sĩ phụ trách
                      </p>
                      <p className="text-sm font-semibold leading-tight">{profile.doctor}</p>
                    </div>
                  </RoundedCard>
                </section>
              )}
            </>
          )}
        </>
      )}
      <Dialog
        open={!!confirmMed}
        onOpenChange={(o) => {
          if (!o) setConfirmMed(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Xác nhận đã uống thuốc</DialogTitle>
            <DialogDescription className="text-xs">
              {confirmMed?.medicine}
              {confirmMed?.dosage ? ` · ${confirmMed.dosage}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-semibold text-muted-foreground">
              Giờ uống
              <input
                type="time"
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium"
              />
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">
              Ghi chú (tuỳ chọn)
              <textarea
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="vd: uống sau bữa sáng"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmMed(null)}
              className="rounded-xl px-3 py-2 text-sm font-semibold border border-border"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={takenMut.isPending}
              onClick={() => {
                if (!confirmMed || !familyId) return;
                const [hh, mm] = confirmTime.split(":").map(Number);
                const at = new Date();
                if (!Number.isNaN(hh)) at.setHours(hh, mm ?? 0, 0, 0);
                takenMut.mutate(
                  {
                    data: {
                      reminder_id: confirmMed.id,
                      family_id: familyId,
                      taken_at: at.toISOString(),
                      note: confirmNote.trim() || undefined,
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success(`Đã ghi nhận: ${confirmMed.medicine}`);
                      setConfirmMed(null);
                    },
                  },
                );
              }}
              className="rounded-xl px-3 py-2 text-sm font-bold bg-brand text-brand-foreground disabled:opacity-60"
            >
              {takenMut.isPending ? "Đang lưu…" : "Xác nhận"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}

// ============ FORMS ============
type AddProfileInput = {
  name: string;
  avatar?: string;
  age?: number;
  relation?: string;
  conditions?: string[];
  doctor?: string;
  phone?: string;
  address?: string;
};

function EmptyProfilesCard({
  onAdd,
  pending,
}: {
  onAdd: (p: AddProfileInput) => void;
  pending: boolean;
}) {
  return (
    <section className="px-4 mt-4">
      <RoundedCard className="text-center space-y-3 py-8">
        <div className="text-5xl">👵</div>
        <p className="text-base font-bold">Chưa có hồ sơ ông/bà</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Thêm hồ sơ đầu tiên để theo dõi sức khoẻ, nhắc thuốc và Safe Check.
        </p>
      </RoundedCard>
      <div className="mt-3">
        <AddProfileForm onSubmit={onAdd} pending={pending} />
      </div>
    </section>
  );
}

function AddProfileForm({
  onSubmit,
  pending,
}: {
  onSubmit: (p: AddProfileInput) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [conditions, setConditions] = useState("");

  return (
    <RoundedCard className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Hồ sơ mới
      </p>
      <input
        placeholder="Tên (vd: Bà Hoa)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Mối quan hệ"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
        />
        <input
          placeholder="Tuổi"
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      <input
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
      />
      <input
        placeholder="Bệnh nền (cách nhau bằng dấu phẩy)"
        value={conditions}
        onChange={(e) => setConditions(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
      />
      <button
        disabled={!name.trim() || pending}
        onClick={() =>
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
        className="w-full rounded-2xl bg-brand text-white text-sm font-bold py-2.5 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu hồ sơ"}
      </button>
    </RoundedCard>
  );
}

function AddMedForm({
  onSubmit,
  pending,
}: {
  onSubmit: (m: { medicine: string; dosage?: string; time_of_day?: string; notes?: string }) => void;
  pending: boolean;
}) {
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("");

  return (
    <RoundedCard className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Nhắc thuốc mới
      </p>
      <input
        placeholder="Tên thuốc (vd: Amlodipine 5mg)"
        value={medicine}
        onChange={(e) => setMedicine(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Liều (vd: 1 viên)"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      <button
        disabled={!medicine.trim() || pending}
        onClick={() =>
          onSubmit({
            medicine: medicine.trim(),
            dosage: dosage.trim() || undefined,
            time_of_day: time || undefined,
          })
        }
        className="w-full rounded-2xl bg-brand text-white text-sm font-bold py-2.5 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu nhắc thuốc"}
      </button>
    </RoundedCard>
  );
}

type SafeCheckPanelProps = {
  profile: ElderlyProfileRow;
  history: SafeCheckRow[];
  historyLoading: boolean;
  isPending: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: (status: "ok" | "warn" | "alert") => void;
};

const STATUS_OPTIONS: Array<{
  key: "ok" | "warn" | "alert";
  label: string;
  emoji: string;
}> = [
  { key: "ok", label: "Khoẻ", emoji: "😊" },
  { key: "warn", label: "Cần lưu ý", emoji: "😐" },
  { key: "alert", label: "Khẩn cấp", emoji: "🚨" },
];

function SafeCheckPanel({
  profile,
  history,
  historyLoading,
  isPending,
  note,
  onNoteChange,
  onConfirm,
}: SafeCheckPanelProps) {
  const [pickedStatus, setPickedStatus] = useState<"ok" | "warn" | "alert">("ok");
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-2xl p-4 flex items-start gap-3",
          statusTone[profile.safe_status],
        )}
      >
        <CheckCircle2 className="h-7 w-7 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">
            Safe Check · {statusLabel[profile.safe_status]}
          </p>
          <p className="text-xs opacity-80 truncate">
            {profile.safe_note ?? "Chưa có ghi chú"}
          </p>
          <p className="text-[11px] opacity-70 mt-0.5">
            {profile.safe_last_at
              ? `Lần xác nhận: ${fmtRelative(profile.safe_last_at)}`
              : "Chưa xác nhận lần nào"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setPickedStatus(opt.key)}
            className={cn(
              "rounded-xl px-2 py-2.5 text-xs font-semibold border transition",
              pickedStatus === opt.key
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-foreground border-border hover:bg-muted",
            )}
          >
            <span className="block text-lg leading-none mb-1">{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Ghi chú (vd: huyết áp ổn, đã ăn sáng)…"
        rows={2}
        maxLength={300}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
      />

      <button
        type="button"
        disabled={isPending}
        onClick={() => onConfirm(pickedStatus)}
        className="w-full rounded-xl bg-brand text-brand-foreground font-bold py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? "Đang xác nhận…" : `Xác nhận: ${statusLabel[pickedStatus]}`}
      </button>

      <div className="pt-1">
        <p className="text-xs font-bold text-muted-foreground mb-2">
          Lịch sử kiểm tra
        </p>
        {historyLoading ? (
          <p className="text-xs text-muted-foreground">Đang tải…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Chưa có lượt kiểm tra nào.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 8).map((h) => (
              <li
                key={h.id}
                className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-block h-2 w-2 rounded-full shrink-0",
                    h.status === "ok"
                      ? "bg-success"
                      : h.status === "warn"
                        ? "bg-warning"
                        : "bg-emergency",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">
                    {statusLabel[h.status]}
                    {h.author_name && (
                      <span className="text-muted-foreground font-normal">
                        {" · "}
                        {h.author_name}
                      </span>
                    )}
                  </p>
                  {h.note && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {h.note}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/80">
                    {fmtRelative(h.checked_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MedicineWeekView({
  days,
  isLoading,
  onMark,
  pending,
}: {
  days: MedicineWeekDay[];
  isLoading: boolean;
  onMark: (reminderId: string) => void;
  pending: boolean;
}) {
  if (isLoading) {
    return (
      <RoundedCard className="grid place-items-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </RoundedCard>
    );
  }
  if (days.length === 0 || days.every((d) => d.entries.length === 0)) {
    return (
      <RoundedCard className="text-center text-sm text-muted-foreground py-6">
        Chưa có nhắc thuốc nào trong tuần.
      </RoundedCard>
    );
  }
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  return (
    <div className="space-y-3">
      {days.map((d) => {
        const dt = new Date(d.date + "T00:00:00");
        const isToday = d.date === todayKey;
        const isPast = d.date < todayKey;
        const taken = d.entries.filter((e) => e.taken).length;
        return (
          <RoundedCard key={d.date} className="p-0 overflow-hidden">
            <div
              className={cn(
                "flex items-center justify-between px-4 py-2.5 border-b border-border",
                isToday && "bg-tint-blue",
              )}
            >
              <div>
                <p className="text-sm font-bold">
                  {dt.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  {isToday && <span className="ml-2 text-[10px] text-brand">HÔM NAY</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {taken}/{d.entries.length} đã uống
                </p>
              </div>
            </div>
            {d.entries.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">Không có thuốc.</div>
            ) : (
              <ul className="divide-y divide-border">
                {d.entries.map((e) => (
                  <li
                    key={`${d.date}-${e.reminder_id}`}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-xl grid place-items-center shrink-0",
                        e.taken ? "bg-tint-green text-success" : "bg-tint-orange text-warning",
                      )}
                    >
                      <Pill className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          e.taken && "line-through text-muted-foreground",
                        )}
                      >
                        {e.medicine}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {e.time_of_day ?? "—"}
                        {e.dosage ? ` · ${e.dosage}` : ""}
                        {e.taken && e.taken_at ? ` · lúc ${fmtTime(e.taken_at)}` : ""}
                      </p>
                    </div>
                    {isToday && !e.taken ? (
                      <button
                        disabled={pending}
                        onClick={() => onMark(e.reminder_id)}
                        className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 bg-brand text-white disabled:opacity-60"
                      >
                        Đã uống
                      </button>
                    ) : e.taken ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <span
                        className={cn(
                          "text-[10px] shrink-0",
                          isPast ? "text-emergency" : "text-muted-foreground",
                        )}
                      >
                        {isPast ? "Bỏ lỡ" : "Chờ"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </RoundedCard>
        );
      })}
    </div>
  );
}
