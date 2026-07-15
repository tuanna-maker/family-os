import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Clock,
  PackageCheck,
  MapPin,
  User as UserIcon,
  Phone,
  Box,
  Truck,
  FileText,
  Camera,
  History,
  Loader2,
  Check,
  Headphones,
  Home,
  DoorOpen,
  ShoppingBag,
  Scale,
  Building2,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createApartmentDelivery,
  listMyApartmentDeliveries,
  DELIVERY_OPTIONS,
  DELIVERY_ITEM_TYPES,
  type DeliveryOptionId,
  type DeliveryItemType,
} from "@/lib/apartment-delivery.functions";

export const Route = createFileRoute("/giao-tan-can-ho")({
  head: () => ({
    meta: [
      { title: "Giao tận căn hộ — STOS Life" },
      { name: "description", content: "Bảo vệ chung cư giao hàng an toàn đến tận cửa căn hộ của bạn." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: ApartmentDeliveryPage,
});

const ITEM_LABELS: Record<DeliveryItemType, string> = {
  package: "Bưu kiện / Hàng hoá",
  food: "Đồ ăn / Thực phẩm",
  fragile: "Hàng dễ vỡ",
  document: "Tài liệu / Thư",
  other: "Khác",
};

const WEIGHT_RANGES = ["< 1 kg", "1 - 5 kg", "5 - 10 kg", "> 10 kg"];

const OPTION_ICONS: Record<DeliveryOptionId, typeof Home> = {
  to_apartment: Home,
  to_door: DoorOpen,
  at_counter: ShoppingBag,
};

const OPTION_THEMES: Record<DeliveryOptionId, { ring: string; bg: string; icon: string; price: string }> = {
  to_apartment: { ring: "border-brand", bg: "bg-brand/15", icon: "text-brand", price: "text-brand" },
  to_door: { ring: "border-info", bg: "bg-info/15", icon: "text-info", price: "text-info" },
  at_counter: { ring: "border-success", bg: "bg-success/15", icon: "text-success", price: "text-success" },
};

function ApartmentDeliveryPage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createApartmentDelivery);
  const listFn = useServerFn(listMyApartmentDeliveries);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const historyQ = useQuery({ queryKey: ["apartment-deliveries"], queryFn: () => listFn(), staleTime: 30_000 });

  const [itemType, setItemType] = useState<DeliveryItemType>("package");
  const [weight, setWeight] = useState<string>("1 - 5 kg");
  const [guardNote, setGuardNote] = useState("");

  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [apartment, setApartment] = useState("");
  const [floorUnit, setFloorUnit] = useState("");
  const [expectedWindow, setExpectedWindow] = useState("Hôm nay, 14:00 - 18:00");
  const [deliveryNote, setDeliveryNote] = useState("");

  const [optionId, setOptionId] = useState<DeliveryOptionId>("to_apartment");
  const [showHistory, setShowHistory] = useState(false);

  // Prefill from family context
  useEffect(() => {
    const fam = ctxQ.data?.family;
    const prof = ctxQ.data?.profile;
    if (fam?.apartment && !apartment) setApartment(fam.apartment);
    if (prof?.full_name && !recipient) setRecipient(prof.full_name);
  }, [ctxQ.data, apartment, recipient]);

  const option = DELIVERY_OPTIONS.find((o) => o.id === optionId)!;
  const deliveryFee = option.fee;
  const serviceFee = 0;
  const total = deliveryFee + serviceFee;

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          item_type: itemType,
          weight_range: weight || null,
          guard_note: guardNote.trim() || null,
          recipient_name: recipient.trim(),
          recipient_phone: phone.trim(),
          apartment: apartment.trim(),
          floor_unit: floorUnit.trim() || null,
          expected_window: expectedWindow.trim() || null,
          delivery_note: deliveryNote.trim() || null,
          option_id: optionId,
          option_label: option.label,
          delivery_fee: deliveryFee,
          service_fee: serviceFee,
          estimated_total: total,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã đặt dịch vụ giao tận căn hộ", {
        description: `Mã: ${res.ticket_code}. Bảo vệ sẽ liên hệ và giao hàng đến căn hộ của bạn.`,
      });
      qc.invalidateQueries({ queryKey: ["apartment-deliveries"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setGuardNote("");
      setDeliveryNote("");
    },
    onError: (e: Error) => toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit =
    recipient.trim().length > 0 &&
    phone.trim().length >= 6 &&
    apartment.trim().length > 0 &&
    !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Giao tận căn hộ"
        subtitle="Bảo vệ sẽ giao hàng đến tận căn hộ của bạn"
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
              <p className="text-lg font-bold leading-tight">Giao hàng an toàn đến tận căn hộ</p>
              <p className="text-xs text-white/80 mt-1">Nhanh chóng • Chu đáo • An tâm</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Badge icon={<ShieldCheck className="h-4 w-4" />} label="An toàn 100%" />
            <Badge icon={<Home className="h-4 w-4" />} label="Giao tận căn hộ" />
            <Badge icon={<Clock className="h-4 w-4" />} label="Giao đúng thời gian" />
            <Badge icon={<Box className="h-4 w-4" />} label="Cẩn thận nguyên vẹn" />
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
            {(historyQ.data ?? []).map((h) => (
              <div key={h.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-tint-blue grid place-items-center shrink-0">
                  <Truck className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {h.payload.option_label ?? "Giao tận căn hộ"} • {h.payload.apartment}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("vi-VN")} •{" "}
                    {h.payload.estimated_total
                      ? `${h.payload.estimated_total.toLocaleString("vi-VN")}đ`
                      : "Miễn phí"}
                  </p>
                </div>
                <StatusPill status={h.status} />
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      {/* 1. ORDER INFO */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Thông tin đơn hàng" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<Box className="h-4 w-4 text-brand" />} label="Loại hàng hoá">
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as DeliveryItemType)}
              className="w-full bg-transparent text-sm font-semibold outline-none"
            >
              {DELIVERY_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ITEM_LABELS[t]}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow icon={<Scale className="h-4 w-4 text-brand" />} label="Trọng lượng (ước tính)">
            <select
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold outline-none text-brand"
            >
              {WEIGHT_RANGES.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Ghi chú cho bảo vệ (tùy chọn)">
            <textarea
              value={guardNote}
              onChange={(e) => setGuardNote(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="Ví dụ: Hàng dễ vỡ, để thùng xốp…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{guardNote.length}/200</p>
          </FormRow>
          <FormRow icon={<Camera className="h-4 w-4 text-brand" />} label="Ảnh hàng hoá (tùy chọn)">
            <p className="text-[11px] text-muted-foreground">Giúp bảo vệ nhận diện dễ dàng hơn</p>
          </FormRow>
        </RoundedCard>
      </section>

      {/* 2. DELIVERY INFO */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Thông tin giao hàng" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<UserIcon className="h-4 w-4 text-brand" />} label="Người nhận">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Tên người nhận"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<Phone className="h-4 w-4 text-brand" />} label="Số điện thoại">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901 234 567"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa chỉ giao">
            <input
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder="VD: A-12A, Toà Sunrise 1"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<Building2 className="h-4 w-4 text-brand" />} label="Tầng & căn hộ">
            <input
              value={floorUnit}
              onChange={(e) => setFloorUnit(e.target.value)}
              placeholder="VD: Tầng 12 - Căn 12A"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<Clock className="h-4 w-4 text-brand" />} label="Thời gian giao dự kiến">
            <input
              value={expectedWindow}
              onChange={(e) => setExpectedWindow(e.target.value)}
              placeholder="Hôm nay, 14:00 - 18:00"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Hướng dẫn giao hàng (tùy chọn)">
            <textarea
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="Ví dụ: Gọi trước khi giao, để trước cửa…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{deliveryNote.length}/200</p>
          </FormRow>
        </RoundedCard>
      </section>

      {/* 3. SERVICE OPTION */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Tuỳ chọn dịch vụ" />
        <div className="grid grid-cols-3 gap-2">
          {DELIVERY_OPTIONS.map((opt) => {
            const active = opt.id === optionId;
            const theme = OPTION_THEMES[opt.id];
            const Icon = OPTION_ICONS[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOptionId(opt.id)}
                className={`relative rounded-2xl p-3 text-left border transition active:scale-[0.97] ${
                  active ? `${theme.ring} bg-card shadow-[var(--shadow-pop)]` : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center ${theme.bg}`}>
                    <Icon className={`h-5 w-5 ${theme.icon}`} />
                  </div>
                  <span
                    className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                      active ? `${theme.ring} bg-brand text-white` : "border-border"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className="mt-2 text-[12px] font-bold leading-tight">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.sub}</p>
                <p className={`text-sm font-extrabold mt-2 ${theme.price}`}>
                  {opt.fee === 0 ? "Miễn phí" : `${opt.fee.toLocaleString("vi-VN")}đ`}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. COST */}
      <section className="px-4 mt-5">
        <SectionHeader title="4. Tổng chi phí" />
        <div className="grid grid-cols-2 gap-3">
          <RoundedCard>
            <Row label={`Phí ${option.label.toLowerCase()}`} value={
              <span className="font-semibold">
                {deliveryFee === 0 ? "Miễn phí" : `${deliveryFee.toLocaleString("vi-VN")}đ`}
              </span>
            } />
            <Row label="Phí dịch vụ" value={<span className="font-semibold">0đ</span>} />
            <div className="h-px bg-border my-2" />
            <Row
              label={<span className="text-sm font-bold">Tổng cộng</span>}
              value={
                <span className="text-lg font-extrabold text-brand">
                  {total === 0 ? "Miễn phí" : `${total.toLocaleString("vi-VN")}đ`}
                </span>
              }
            />
          </RoundedCard>
          <RoundedCard>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-bold">Cam kết của chúng tôi</p>
            </div>
            <ul className="space-y-1.5 text-[11px] text-foreground/80">
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Giao hàng đúng người, đúng căn hộ</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Bảo vệ được đào tạo chuyên nghiệp</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Xác minh & giám sát toàn bộ quá trình</li>
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
            className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-pink to-emergency text-white font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
    in_progress: { label: "Đang giao", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Đã giao", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>{s.label}</span>;
}
