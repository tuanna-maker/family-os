import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Camera,
  ClipboardList,
  PackageCheck,
  MapPin,
  User as UserIcon,
  Phone,
  Box,
  Truck,
  Calendar,
  FileText,
  Bell,
  Headphones,
  History,
  ChevronRight,
  Loader2,
  Infinity as InfinityIcon,
  CalendarRange,
  Clock,
  Check,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createPackageHold,
  listMyPackageHolds,
  HOLD_PLAN_META,
  ITEM_TYPES,
  type HoldPlan,
  type ItemType,
} from "@/lib/package-hold.functions";

export const Route = createFileRoute("/nhan-hang-ho")({
  head: () => ({
    meta: [
      { title: "Nhận & giữ hộ hàng hoá — STOS Life" },
      { name: "description", content: "Bảo vệ chung cư nhận, kiểm tra và giữ hộ bưu kiện đến khi bạn lấy." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: PackageHoldPage,
});

const ITEM_LABELS: Record<ItemType, string> = {
  package: "Bưu kiện / Hàng hoá",
  food: "Đồ ăn / Thực phẩm",
  fragile: "Hàng dễ vỡ",
  document: "Tài liệu / Thư",
  other: "Khác",
};

const HOLD_ICONS: Record<HoldPlan, typeof Clock> = {
  standard: Clock,
  extended: CalendarRange,
  long_term: InfinityIcon,
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PackageHoldPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createPackageHold);
  const listFn = useServerFn(listMyPackageHolds);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const historyQ = useQuery({ queryKey: ["package-holds"], queryFn: () => listFn(), staleTime: 30_000 });

  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [itemType, setItemType] = useState<ItemType>("package");
  const [courier, setCourier] = useState("Giao hàng nhanh (GHN)");
  const [expectedDate, setExpectedDate] = useState(todayISO());
  const [timeWindow, setTimeWindow] = useState("09:00-18:00");
  const [courierNote, setCourierNote] = useState("");
  const [holdPlan, setHoldPlan] = useState<HoldPlan>("standard");
  const [notifyOnArrival, setNotifyOnArrival] = useState(true);
  const [photoOnReceive, setPhotoOnReceive] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Prefill from family context once
  useEffect(() => {
    const fam = ctxQ.data?.family;
    const prof = ctxQ.data?.profile;
    if (fam?.apartment && !address) setAddress(fam.apartment);
    if (prof?.full_name && !recipient) setRecipient(prof.full_name);
  }, [ctxQ.data, address, recipient]);

  const planMeta = HOLD_PLAN_META[holdPlan];
  const estimatedCost = useMemo(() => {
    if (holdPlan === "standard") return 0;
    if (holdPlan === "extended") return 0; // first 3 days free, after that 20k/day — estimated 0 at booking
    return 0;
  }, [holdPlan]);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          address: address.trim(),
          recipient_name: recipient.trim(),
          phone: phone.trim(),
          item_type: itemType,
          courier: courier.trim() || null,
          expected_date: expectedDate,
          expected_time_window: timeWindow.trim() || null,
          courier_note: courierNote.trim() || null,
          hold_plan: holdPlan,
          notify_on_arrival: notifyOnArrival,
          photo_on_receive: photoOnReceive,
          estimated_cost: estimatedCost,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã đặt dịch vụ giữ hộ", {
        description: `Mã: ${res.ticket_code}. Bảo vệ sẽ nhận và thông báo khi hàng tới.`,
      });
      qc.invalidateQueries({ queryKey: ["package-holds"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setCourierNote("");
    },
    onError: (e: Error) => toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit =
    address.trim().length > 0 &&
    recipient.trim().length > 0 &&
    phone.trim().length >= 6 &&
    expectedDate.length > 0 &&
    !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Nhận & giữ hộ hàng hoá"
        subtitle="Bảo vệ sẽ nhận, kiểm tra và giữ hộ hàng hoá cho bạn"
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
        <RoundedCard className="bg-gradient-to-br from-navy via-navy to-brand text-white border-0 overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center shrink-0">
              <PackageCheck className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold">Nhận – Kiểm tra – Giữ hộ an toàn</p>
              <p className="text-xs text-white/80 mt-1 leading-snug">
                Bảo vệ chung cư sẽ thay bạn nhận hàng và giữ tại quầy bảo vệ đến khi bạn lấy.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Badge icon={<ShieldCheck className="h-4 w-4" />} label="An toàn 100%" />
            <Badge icon={<Camera className="h-4 w-4" />} label="Có camera xác nhận" />
            <Badge icon={<ClipboardList className="h-4 w-4" />} label="Kiểm tra & báo cáo" />
            <Badge icon={<Box className="h-4 w-4" />} label="Lưu giữ tối đa 7 ngày" />
          </div>
        </RoundedCard>
      </section>

      {/* HISTORY */}
      {showHistory && (
        <section className="px-4 mt-4">
          <SectionHeader title="Lịch sử yêu cầu" subtitle={historyQ.data ? `${historyQ.data.length} yêu cầu` : undefined} />
          <RoundedCard className="p-0 divide-y divide-border">
            {historyQ.isLoading && (
              <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
              </div>
            )}
            {!historyQ.isLoading && (historyQ.data ?? []).length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Chưa có yêu cầu nào.</div>
            )}
            {(historyQ.data ?? []).map((h) => (
              <div key={h.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-tint-blue grid place-items-center shrink-0">
                  <PackageCheck className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {ITEM_LABELS[h.payload.item_type] ?? "Bưu kiện"} • {h.payload.courier ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("vi-VN")} • {h.payload.hold_plan ? HOLD_PLAN_META[h.payload.hold_plan].label : ""}
                  </p>
                </div>
                <StatusPill status={h.status} />
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      {/* 1. RECIPIENT INFO */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Thông tin nhận hàng" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa chỉ nhận hàng">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: Căn hộ A-12A, Toà Sunrise 1"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<UserIcon className="h-4 w-4 text-brand" />} label="Người nhận">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Tên người nhận"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<Phone className="h-4 w-4 text-brand" />} label="Số điện thoại liên hệ">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901 234 567"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
        </RoundedCard>
      </section>

      {/* 2. ORDER INFO */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Thông tin đơn hàng" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<Box className="h-4 w-4 text-brand" />} label="Loại hàng hoá">
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
              className="w-full bg-transparent text-sm font-semibold outline-none"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{ITEM_LABELS[t]}</option>
              ))}
            </select>
          </FormRow>
          <FormRow icon={<Truck className="h-4 w-4 text-brand" />} label="Đơn vị giao hàng">
            <input
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="VD: GHN, GHTK, J&T…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <div className="grid grid-cols-2 divide-x divide-border">
            <FormRow icon={<Calendar className="h-4 w-4 text-brand" />} label="Ngày dự kiến giao">
              <input
                type="date"
                value={expectedDate}
                min={todayISO()}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </FormRow>
            <FormRow icon={<Clock className="h-4 w-4 text-brand" />} label="Khung giờ">
              <input
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                placeholder="09:00 - 18:00"
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </FormRow>
          </div>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Ghi chú cho đơn vị giao hàng">
            <textarea
              value={courierNote}
              onChange={(e) => setCourierNote(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="VD: Gọi trước khi giao. Đặt tại quầy bảo vệ sảnh A."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{courierNote.length}/200</p>
          </FormRow>
        </RoundedCard>
      </section>

      {/* 3. HOLD PLAN */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Lựa chọn lưu giữ" />
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(HOLD_PLAN_META) as HoldPlan[]).map((plan) => {
            const meta = HOLD_PLAN_META[plan];
            const Icon = HOLD_ICONS[plan];
            const active = plan === holdPlan;
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setHoldPlan(plan)}
                className={`relative rounded-2xl p-3 text-left border transition active:scale-[0.97] ${
                  active ? "border-brand bg-tint-blue/40 shadow-[var(--shadow-pop)]" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`h-9 w-9 rounded-xl grid place-items-center ${active ? "bg-brand/15" : "bg-muted"}`}>
                    <Icon className={`h-4 w-4 ${active ? "text-brand" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                    active ? "border-brand bg-brand text-white" : "border-border"
                  }`}>
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className="mt-2 text-[12px] font-bold leading-tight">{meta.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{meta.sub}</p>
                <p className={`text-[11px] font-semibold mt-1.5 ${active ? "text-brand" : "text-foreground/70"}`}>
                  {meta.price}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. OPTIONS & 5. COST */}
      <section className="px-4 mt-5 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <SectionHeader title="4. Tuỳ chọn bổ sung" />
            <RoundedCard className="p-0 divide-y divide-border">
              <ToggleRow
                icon={<Bell className="h-4 w-4 text-brand" />}
                title="Thông báo khi hàng đến"
                desc="Gửi thông báo ngay khi bảo vệ nhận hàng"
                checked={notifyOnArrival}
                onChange={setNotifyOnArrival}
              />
              <ToggleRow
                icon={<Camera className="h-4 w-4 text-brand" />}
                title="Chụp ảnh hàng hoá"
                desc="Bảo vệ chụp ảnh khi nhận hàng"
                checked={photoOnReceive}
                onChange={setPhotoOnReceive}
              />
            </RoundedCard>
          </div>

          <div>
            <SectionHeader title="5. Ước tính chi phí" />
            <RoundedCard>
              <Row label={`${planMeta.label} (${planMeta.freeDays} ngày)`} value={<span className="text-success font-semibold">Miễn phí</span>} />
              <Row label="Dịch vụ bổ sung" value={<span className="text-success font-semibold">Miễn phí</span>} />
              <div className="h-px bg-border my-2" />
              <Row
                label={<span className="text-sm font-bold">Tổng cộng</span>}
                value={<span className="text-lg font-extrabold text-brand">{estimatedCost === 0 ? "0đ" : `${estimatedCost.toLocaleString("vi-VN")}đ`}</span>}
              />
              {holdPlan !== "standard" && (
                <div className="mt-2 rounded-xl bg-tint-green/40 p-2.5 flex gap-2 items-start">
                  <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                  <p className="text-[11px] text-foreground/80 leading-snug">
                    Miễn phí giữ hộ {planMeta.freeDays} ngày đầu tiên. Từ ngày thứ {planMeta.freeDays + 1}:{" "}
                    {planMeta.dailyFee.toLocaleString("vi-VN")}đ / ngày.
                  </p>
                </div>
              )}
            </RoundedCard>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="px-4 mt-5">
        <RoundedCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-tint-green grid place-items-center">
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm font-bold">Quy trình nhận & giữ hộ</p>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              "Đơn vị giao hàng đến bảo vệ",
              "Bảo vệ kiểm tra, chụp ảnh hàng hoá",
              "Bạn nhận thông báo hàng đã đến",
              "Bạn đến lấy hàng tại quầy bảo vệ",
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto h-7 w-7 rounded-full bg-brand text-white text-[11px] font-bold grid place-items-center">
                  {i + 1}
                </div>
                <p className="text-[10px] text-foreground/70 mt-1.5 leading-tight">{step}</p>
              </div>
            ))}
          </div>
        </RoundedCard>
      </section>

      {/* SPACER FOR ACTION BAR */}
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
            className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
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

function ToggleRow({
  icon, title, desc, checked, onChange,
}: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className="h-9 w-9 rounded-xl bg-tint-blue grid place-items-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
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
    in_progress: { label: "Đang xử lý", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Đã giao", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>{s.label}</span>;
}
