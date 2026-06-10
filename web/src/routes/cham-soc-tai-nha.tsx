import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  HeartPulse,
  Users,
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
  Building2,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createHomeCare,
  listMyHomeCare,
  CARE_DURATIONS,
  CARE_TARGETS,
  CARE_TASKS,
  type CareDurationId,
  type CareTarget,
} from "@/lib/home-care.functions";

export const Route = createFileRoute("/cham-soc-tai-nha")({
  head: () => ({
    meta: [
      { title: "Hỗ trợ chăm sóc tại nhà — STOS Life" },
      { name: "description", content: "Đặt dịch vụ chăm sóc người lớn tuổi, trẻ em hoặc người bệnh tại căn hộ." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: HomeCarePage,
});

const TARGET_META: Record<CareTarget, { label: string; icon: typeof Users; tint: string; color: string }> = {
  elderly: { label: "Người cao tuổi", icon: Users, tint: "bg-pink/15", color: "text-pink" },
  child: { label: "Trẻ em", icon: Baby, tint: "bg-info/15", color: "text-info" },
  patient: { label: "Người bệnh", icon: Stethoscope, tint: "bg-warning/15", color: "text-warning" },
  other: { label: "Khác", icon: UserCheck, tint: "bg-brand/15", color: "text-brand" },
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function HomeCarePage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createHomeCare);
  const listFn = useServerFn(listMyHomeCare);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const historyQ = useQuery({ queryKey: ["home-care"], queryFn: () => listFn(), staleTime: 30_000 });

  const [target, setTarget] = useState<CareTarget>("elderly");
  const [recipient, setRecipient] = useState("");
  const [recipientAge, setRecipientAge] = useState<string>("");
  const [apartment, setApartment] = useState("");
  const [floorUnit, setFloorUnit] = useState("");

  const [startDate, setStartDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("08:00");
  const [durationId, setDurationId] = useState<CareDurationId>("h4");

  const [tasks, setTasks] = useState<string[]>(["Trông coi, ở bên cạnh", "Nhắc uống thuốc"]);
  const [healthNotes, setHealthNotes] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");

  const [showHistory, setShowHistory] = useState(false);

  // Prefill from family context
  useEffect(() => {
    const fam = ctxQ.data?.family;
    const prof = ctxQ.data?.profile;
    if (fam?.apartment && !apartment) setApartment(fam.apartment);
    if (prof?.full_name && !contactName) setContactName(prof.full_name);
  }, [ctxQ.data, apartment, contactName]);

  const duration = CARE_DURATIONS.find((d) => d.id === durationId)!;
  const baseFee = duration.fee;
  const serviceFee = 0;
  const total = baseFee + serviceFee;

  function toggleTask(t: string) {
    setTasks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          target,
          recipient_name: recipient.trim(),
          recipient_age: recipientAge ? Number(recipientAge) : null,
          apartment: apartment.trim(),
          floor_unit: floorUnit.trim() || null,
          start_date: startDate,
          start_time: startTime,
          duration_id: durationId,
          duration_label: duration.label,
          duration_hours: duration.hours,
          tasks,
          health_notes: healthNotes.trim() || null,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          special_request: specialRequest.trim() || null,
          base_fee: baseFee,
          service_fee: serviceFee,
          estimated_total: total,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã đặt dịch vụ chăm sóc tại nhà", {
        description: `Mã: ${res.ticket_code}. Nhân viên chăm sóc sẽ liên hệ xác nhận lịch.`,
      });
      qc.invalidateQueries({ queryKey: ["home-care"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setHealthNotes("");
      setSpecialRequest("");
    },
    onError: (e: Error) => toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit =
    recipient.trim().length > 0 &&
    apartment.trim().length > 0 &&
    contactName.trim().length > 0 &&
    contactPhone.trim().length >= 6 &&
    !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Hỗ trợ chăm sóc tại nhà"
        subtitle="Đồng hành an toàn cho người thân khi gia đình vắng mặt"
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
        <RoundedCard className="bg-gradient-to-br from-pink via-pink to-brand text-white border-0 overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center shrink-0">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">Chăm sóc tận tâm tại căn hộ</p>
              <p className="text-xs text-white/85 mt-1">Tận tâm • Chuyên nghiệp • An toàn</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Badge icon={<ShieldCheck className="h-4 w-4" />} label="Đã xác minh" />
            <Badge icon={<HeartPulse className="h-4 w-4" />} label="Có nghiệp vụ y tế" />
            <Badge icon={<Clock className="h-4 w-4" />} label="Đúng giờ" />
            <Badge icon={<Users className="h-4 w-4" />} label="Báo cáo định kỳ" />
          </div>
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
              const meta = TARGET_META[h.payload.target] ?? TARGET_META.other;
              const Icon = meta.icon;
              return (
                <div key={h.id} className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-2xl grid place-items-center shrink-0 ${meta.tint}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {meta.label} • {h.payload.recipient_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {h.payload.start_date} {h.payload.start_time} • {h.payload.duration_label}
                    </p>
                  </div>
                  <StatusPill status={h.status} />
                </div>
              );
            })}
          </RoundedCard>
        </section>
      )}

      {/* 1. RECIPIENT */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Người được chăm sóc" />
        <div className="grid grid-cols-4 gap-2 mb-3">
          {CARE_TARGETS.map((t) => {
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
              placeholder="Tên người được chăm sóc"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <div className="grid grid-cols-2 divide-x divide-border">
            <FormRow icon={<Calendar className="h-4 w-4 text-brand" />} label="Tuổi (tuỳ chọn)">
              <input
                inputMode="numeric"
                value={recipientAge}
                onChange={(e) => setRecipientAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="VD: 72"
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </FormRow>
            <FormRow icon={<Building2 className="h-4 w-4 text-brand" />} label="Tầng & căn hộ">
              <input
                value={floorUnit}
                onChange={(e) => setFloorUnit(e.target.value)}
                placeholder="VD: Tầng 12 - 12A"
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </FormRow>
          </div>
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa chỉ căn hộ">
            <input
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder="VD: A-12A, Toà Sunrise 1"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
        </RoundedCard>
      </section>

      {/* 2. SCHEDULE */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Lịch chăm sóc" />
        <RoundedCard className="p-0 divide-y divide-border">
          <div className="grid grid-cols-2 divide-x divide-border">
            <FormRow icon={<Calendar className="h-4 w-4 text-brand" />} label="Ngày bắt đầu">
              <input
                type="date"
                value={startDate}
                min={todayISO()}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </FormRow>
            <FormRow icon={<Clock className="h-4 w-4 text-brand" />} label="Giờ bắt đầu">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </FormRow>
          </div>
        </RoundedCard>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {CARE_DURATIONS.map((d) => {
            const active = d.id === durationId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDurationId(d.id)}
                className={`rounded-2xl p-3 text-left border transition active:scale-[0.97] ${
                  active ? "border-brand bg-tint-blue/40 shadow-[var(--shadow-pop)]" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{d.label}</p>
                  <span
                    className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                      active ? "border-brand bg-brand text-white" : "border-border"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className={`text-sm font-extrabold mt-1 ${active ? "text-brand" : "text-foreground/70"}`}>
                  {d.fee.toLocaleString("vi-VN")}đ
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. TASKS */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Nội dung chăm sóc" subtitle="Chọn các đầu việc cần hỗ trợ" />
        <div className="flex flex-wrap gap-2">
          {CARE_TASKS.map((t) => {
            const active = tasks.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTask(t)}
                className={`rounded-2xl px-3 py-2 text-[12px] font-semibold border transition active:scale-95 ${
                  active
                    ? "border-brand bg-brand text-white shadow-[var(--shadow-pop)]"
                    : "border-border bg-card text-foreground/80"
                }`}
              >
                {active && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                {t}
              </button>
            );
          })}
        </div>
        <RoundedCard className="mt-3 p-0">
          <FormRow icon={<HeartPulse className="h-4 w-4 text-brand" />} label="Tình trạng sức khoẻ / lưu ý">
            <textarea
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="VD: Có tiền sử cao huyết áp, dị ứng hải sản, hay quên uống thuốc…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{healthNotes.length}/300</p>
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
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Yêu cầu đặc biệt (tuỳ chọn)">
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="VD: Ưu tiên nhân viên nữ, biết tiếng Anh…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{specialRequest.length}/300</p>
          </FormRow>
        </RoundedCard>
      </section>

      {/* 5. COST */}
      <section className="px-4 mt-5">
        <SectionHeader title="5. Ước tính chi phí" />
        <div className="grid grid-cols-2 gap-3">
          <RoundedCard>
            <Row label={`Phí ${duration.label.toLowerCase()}`} value={
              <span className="font-semibold">{baseFee.toLocaleString("vi-VN")}đ</span>
            } />
            <Row label="Phí dịch vụ" value={<span className="font-semibold">0đ</span>} />
            <div className="h-px bg-border my-2" />
            <Row
              label={<span className="text-sm font-bold">Tổng cộng</span>}
              value={<span className="text-lg font-extrabold text-brand">{total.toLocaleString("vi-VN")}đ</span>}
            />
            <p className="text-[10px] text-muted-foreground mt-2">
              * Chi phí cuối được xác nhận sau khi nhân viên chăm sóc trao đổi trực tiếp với gia đình.
            </p>
          </RoundedCard>
          <RoundedCard>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-bold">Cam kết</p>
            </div>
            <ul className="space-y-1.5 text-[11px] text-foreground/80">
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Nhân viên được đào tạo & xác minh nhân thân</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Có nghiệp vụ sơ cứu cơ bản</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Báo cáo cho gia đình sau mỗi ca</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Bảo mật thông tin riêng tư</li>
            </ul>
          </RoundedCard>
        </div>
      </section>

      {/* SPACER */}
      <div className="h-28" />

      {/* BOTTOM ACTION BAR */}
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
            className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-pink to-brand text-white font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
            {create.isPending ? "Đang gửi…" : "Xác nhận đặt dịch vụ"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-2 flex flex-col items-center gap-1 text-center">
      <div className="h-7 w-7 rounded-xl bg-white/15 grid place-items-center">{icon}</div>
      <p className="text-[9px] font-semibold leading-tight">{label}</p>
    </div>
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
    in_progress: { label: "Đang chăm sóc", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Hoàn tất", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>{s.label}</span>;
}
