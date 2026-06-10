import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Clock,
  Calendar,
  MapPin,
  User as UserIcon,
  Phone,
  FileText,
  Loader2,
  History,
  Check,
  Headphones,
  Baby,
  UserCheck,
  Stethoscope,
  Users,
  ArrowUpToLine,
  ArrowDownToLine,
  Accessibility,
  HeartPulse,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createEscort,
  listMyEscorts,
  ESCORT_DIRECTIONS,
  ESCORT_TARGETS,
  ESCORT_BASE_FEE,
  type EscortDirection,
  type EscortTarget,
  type EscortFrequency,
} from "@/lib/escort.functions";

export const Route = createFileRoute("/dua-don-can-ho")({
  head: () => ({
    meta: [
      { title: "Đưa đón lên/xuống căn hộ — STOS Life" },
      { name: "description", content: "Đặt dịch vụ bảo vệ hỗ trợ đưa đón người già, trẻ em lên/xuống căn hộ an toàn." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: EscortPage,
});

const TARGET_META: Record<EscortTarget, { label: string; icon: typeof Users; tint: string; color: string }> = {
  elderly: { label: "Người cao tuổi", icon: Users, tint: "bg-pink/15", color: "text-pink" },
  child: { label: "Trẻ em", icon: Baby, tint: "bg-info/15", color: "text-info" },
  patient: { label: "Người bệnh", icon: Stethoscope, tint: "bg-warning/15", color: "text-warning" },
  other: { label: "Khác", icon: UserCheck, tint: "bg-brand/15", color: "text-brand" },
};

const ASSIST_DEVICES = ["Không cần", "Xe lăn", "Gậy chống", "Xe nôi", "Khác"];

const HEALTH_PRESETS = ["Đi lại bình thường", "Đi lại chậm", "Cần dìu", "Khó di chuyển"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EscortPage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createEscort);
  const listFn = useServerFn(listMyEscorts);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const historyQ = useQuery({ queryKey: ["escort"], queryFn: () => listFn(), staleTime: 30_000 });

  const [direction, setDirection] = useState<EscortDirection>("up");
  const [target, setTarget] = useState<EscortTarget>("elderly");
  const [recipient, setRecipient] = useState("");
  const [recipientAge, setRecipientAge] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<string>(HEALTH_PRESETS[1]);
  const [recipientNote, setRecipientNote] = useState("");

  const [pickup, setPickup] = useState("Sảnh tháp A - Tầng 1");
  const [dropoff, setDropoff] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayISO());
  const [scheduledTime, setScheduledTime] = useState("08:30");
  const [frequency, setFrequency] = useState<EscortFrequency>("once");
  const [assistDevice, setAssistDevice] = useState<string>("Không cần");
  const [extraNote, setExtraNote] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fam = ctxQ.data?.family;
    const prof = ctxQ.data?.profile;
    if (fam?.apartment && !dropoff) setDropoff(`Căn hộ ${fam.apartment}`);
    if (prof?.full_name && !contactName) setContactName(prof.full_name);
  }, [ctxQ.data, dropoff, contactName]);

  // Khi đổi hướng: hoán đổi pickup/dropoff gợi ý
  function changeDirection(d: EscortDirection) {
    setDirection(d);
    const apt = ctxQ.data?.family?.apartment ? `Căn hộ ${ctxQ.data.family.apartment}` : "";
    if (d === "up") {
      setPickup("Sảnh tháp A - Tầng 1");
      if (apt) setDropoff(apt);
    } else {
      if (apt) setPickup(apt);
      setDropoff("Sảnh tháp A - Tầng 1");
    }
  }

  const total = ESCORT_BASE_FEE;
  const directionMeta = ESCORT_DIRECTIONS.find((x) => x.id === direction)!;

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          direction,
          direction_label: directionMeta.label,
          recipient_name: recipient.trim(),
          recipient_age: recipientAge ? Number(recipientAge) : null,
          recipient_target: target,
          recipient_health: healthStatus || null,
          recipient_note: recipientNote.trim() || null,
          pickup_location: pickup.trim(),
          dropoff_location: dropoff.trim(),
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          frequency,
          assist_device: assistDevice === "Không cần" ? null : assistDevice,
          extra_note: extraNote.trim() || null,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          preferred_staff: null,
          estimated_total: total,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã đặt dịch vụ đưa đón", {
        description: `Mã: ${res.ticket_code}. Bảo vệ sẽ liên hệ xác nhận lịch.`,
      });
      qc.invalidateQueries({ queryKey: ["escort"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setRecipientNote("");
      setExtraNote("");
    },
    onError: (e: Error) => toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit =
    recipient.trim().length > 0 &&
    pickup.trim().length > 0 &&
    dropoff.trim().length > 0 &&
    contactName.trim().length > 0 &&
    contactPhone.trim().length >= 6 &&
    !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Đưa đón lên/xuống căn hộ"
        subtitle="Hỗ trợ đưa đón người già, trẻ em lên/xuống căn hộ an toàn"
        right={
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="h-10 w-10 rounded-2xl bg-card border border-border grid place-items-center"
            aria-label="Lịch sử"
          >
            <History className="h-4 w-4" />
          </button>
        }
      />

      {/* HERO */}
      <section className="px-4 mt-2">
        <RoundedCard className="bg-gradient-to-br from-brand via-info to-pink text-white border-0 overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center shrink-0">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">An toàn tận tâm · Đưa đón chu đáo</p>
              <p className="text-xs text-white/85 mt-1">Bảo vệ toà nhà hỗ trợ tận nơi</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-[12px]">
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5" /> Nhân viên bảo vệ hỗ trợ tận nơi</li>
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5" /> Đúng giờ — Chu đáo — An toàn</li>
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5" /> Báo cáo đầy đủ cho người thân</li>
          </ul>
        </RoundedCard>
      </section>

      {/* HISTORY */}
      {showHistory && (
        <section className="px-4 mt-4">
          <SectionHeader
            title="Lịch sử yêu cầu"
            subtitle={historyQ.data ? `${historyQ.data.length} yêu cầu` : undefined}
          />
          <RoundedCard className="p-0 divide-y divide-border">
            {historyQ.isLoading && (
              <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
              </div>
            )}
            {!historyQ.isLoading && (historyQ.data ?? []).length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Chưa có yêu cầu nào.</div>
            )}
            {(historyQ.data ?? []).map((h) => {
              const Icon = h.payload.direction === "down" ? ArrowDownToLine : ArrowUpToLine;
              return (
                <div key={h.id} className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl grid place-items-center shrink-0 bg-tint-blue">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {h.payload.direction_label} • {h.payload.recipient_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {h.payload.scheduled_date} {h.payload.scheduled_time} • {h.payload.pickup_location} → {h.payload.dropoff_location}
                    </p>
                  </div>
                  <StatusPill status={h.status} />
                </div>
              );
            })}
          </RoundedCard>
        </section>
      )}

      {/* 1. DIRECTION */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Chọn dịch vụ" />
        <div className="grid grid-cols-2 gap-3">
          {ESCORT_DIRECTIONS.map((d) => {
            const active = d.id === direction;
            const Icon = d.id === "up" ? ArrowUpToLine : ArrowDownToLine;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => changeDirection(d.id)}
                className={`rounded-3xl p-4 text-left border transition active:scale-[0.97] ${
                  active ? "border-brand bg-tint-blue/40 shadow-[var(--shadow-pop)]" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-2xl grid place-items-center ${active ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                      active ? "border-brand bg-brand text-white" : "border-border"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold leading-tight">{d.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{d.sub}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. RECIPIENT */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Thông tin người được đưa đón" />
        <div className="grid grid-cols-4 gap-2 mb-3">
          {ESCORT_TARGETS.map((t) => {
            const meta = TARGET_META[t];
            const Icon = meta.icon;
            const active = t === target;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={`rounded-2xl p-2.5 border text-center transition active:scale-[0.97] ${
                  active ? "border-brand bg-tint-blue/40 shadow-[var(--shadow-pop)]" : "border-border bg-card"
                }`}
              >
                <div className={`mx-auto h-10 w-10 rounded-xl grid place-items-center ${active ? meta.tint : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${active ? meta.color : "text-muted-foreground"}`} />
                </div>
                <p className="text-[11px] font-bold mt-1.5 leading-tight">{meta.label}</p>
              </button>
            );
          })}
        </div>
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<UserIcon className="h-4 w-4 text-brand" />} label="Họ tên">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="VD: Bà Nguyễn Thị Lan"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <div className="grid grid-cols-2 divide-x divide-border">
            <FormRow icon={<Calendar className="h-4 w-4 text-brand" />} label="Tuổi (tuỳ chọn)">
              <input
                inputMode="numeric"
                value={recipientAge}
                onChange={(e) => setRecipientAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="VD: 78"
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </FormRow>
            <FormRow icon={<HeartPulse className="h-4 w-4 text-brand" />} label="Tình trạng sức khoẻ">
              <select
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              >
                {HEALTH_PRESETS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </FormRow>
          </div>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Ghi chú (tuỳ chọn)">
            <textarea
              value={recipientNote}
              onChange={(e) => setRecipientNote(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="VD: Bà bị đau đầu gối, đi lại cần hỗ trợ nhẹ."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{recipientNote.length}/200</p>
          </FormRow>
        </RoundedCard>
      </section>

      {/* 3. TRIP INFO */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Thông tin đưa đón" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa điểm đón">
            <input
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="VD: Sảnh tháp A - Tầng 1"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa điểm đến">
            <input
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder="VD: Căn hộ A12A - Tầng 12"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <div className="grid grid-cols-2 divide-x divide-border">
            <FormRow icon={<Calendar className="h-4 w-4 text-brand" />} label="Ngày">
              <input
                type="date"
                value={scheduledDate}
                min={todayISO()}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </FormRow>
            <FormRow icon={<Clock className="h-4 w-4 text-brand" />} label="Giờ">
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </FormRow>
          </div>
          <div className="p-3.5">
            <p className="text-[11px] text-muted-foreground font-medium mb-2">Tần suất</p>
            <div className="grid grid-cols-2 gap-2">
              {(["once", "repeat"] as EscortFrequency[]).map((f) => {
                const active = f === frequency;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`rounded-2xl px-3 py-2 text-xs font-semibold border transition ${
                      active ? "border-brand bg-brand text-white" : "border-border bg-card text-foreground/80"
                    }`}
                  >
                    {f === "once" ? "Một lần" : "Lặp lại"}
                  </button>
                );
              })}
            </div>
          </div>
          <FormRow icon={<Accessibility className="h-4 w-4 text-brand" />} label="Phương tiện hỗ trợ">
            <select
              value={assistDevice}
              onChange={(e) => setAssistDevice(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold outline-none"
            >
              {ASSIST_DEVICES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </FormRow>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Ghi chú thêm (tuỳ chọn)">
            <textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value.slice(0, 150))}
              rows={2}
              placeholder="VD: Cần hỗ trợ mang túi xách, thuốc men…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{extraNote.length}/150</p>
          </FormRow>
        </RoundedCard>
      </section>

      {/* 4. CONTACT */}
      <section className="px-4 mt-5">
        <SectionHeader title="4. Người liên hệ" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<UserIcon className="h-4 w-4 text-brand" />} label="Họ tên">
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Người nhà liên hệ"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<Phone className="h-4 w-4 text-brand" />} label="Số điện thoại">
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="VD: 0901 234 567"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
        </RoundedCard>
      </section>

      {/* 5. COST */}
      <section className="px-4 mt-5">
        <SectionHeader title="5. Tổng chi phí ước tính" />
        <RoundedCard>
          <Row
            label="Phí đưa đón / lần"
            value={<span className="font-semibold">{ESCORT_BASE_FEE.toLocaleString("vi-VN")}đ</span>}
          />
          <div className="h-px bg-border my-2" />
          <Row
            label={<span className="text-sm font-bold">Tổng cộng</span>}
            value={<span className="text-lg font-extrabold text-brand">{total.toLocaleString("vi-VN")}đ/lần</span>}
          />
          <p className="text-[10px] text-muted-foreground mt-2">
            * Dịch vụ được thực hiện bởi nhân viên bảo vệ chung cư. Cam kết an toàn tuyệt đối.
          </p>
        </RoundedCard>
      </section>

      <div className="h-28" />

      <div className="fixed bottom-24 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-background/95 backdrop-blur-xl border border-border shadow-[var(--shadow-pop)] p-2 flex items-center gap-2 pointer-events-auto">
          <Link
            to="/bao-an"
            className="h-12 px-4 rounded-2xl border border-border flex items-center gap-1.5 text-xs font-semibold text-foreground/80 active:scale-95 transition"
          >
            <Headphones className="h-4 w-4" /> Hỏi tư vấn
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {create.isPending ? "Đang gửi…" : "Tiếp tục — Xác nhận đặt dịch vụ"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function FormRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 p-3.5">
      <div className="h-9 w-9 rounded-xl bg-tint-blue grid place-items-center shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </label>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-foreground/80">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Đang chờ", cls: "bg-tint-orange text-warning" },
    in_progress: { label: "Đang thực hiện", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Hoàn tất", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>{s.label}</span>;
}
