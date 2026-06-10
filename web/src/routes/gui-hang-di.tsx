import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Send,
  ShieldCheck,
  Package,
  Truck,
  Box,
  MapPin,
  User as UserIcon,
  Phone,
  FileText,
  Bell,
  Camera,
  Loader2,
  History,
  Check,
  Headphones,
  PackageCheck,
  Scale,
  Ruler,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createPackageShip,
  listMyPackageShips,
  COURIERS,
  SHIP_ITEM_TYPES,
  type ShipItemType,
  type CourierId,
} from "@/lib/package-ship.functions";

export const Route = createFileRoute("/gui-hang-di")({
  head: () => ({
    meta: [
      { title: "Gửi hàng đi — STOS Life" },
      { name: "description", content: "Bảo vệ chung cư hỗ trợ gửi hàng qua đơn vị vận chuyển nhanh chóng, an toàn." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: ShipPage,
});

const ITEM_LABELS: Record<ShipItemType, string> = {
  package: "Bưu kiện / Hàng hoá",
  document: "Tài liệu / Thư",
  fragile: "Hàng dễ vỡ",
  food: "Đồ ăn / Thực phẩm",
  other: "Khác",
};

function ShipPage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createPackageShip);
  const listFn = useServerFn(listMyPackageShips);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const historyQ = useQuery({ queryKey: ["package-ships"], queryFn: () => listFn(), staleTime: 30_000 });

  const [senderName, setSenderName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [itemType, setItemType] = useState<ShipItemType>("package");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [description, setDescription] = useState("");
  const [courierId, setCourierId] = useState<CourierId>("ghn");
  const [insurance, setInsurance] = useState(false);
  const [packHelp, setPackHelp] = useState(false);
  const [notifyRecipient, setNotifyRecipient] = useState(true);
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Prefill sender info from family context
  useEffect(() => {
    const fam = ctxQ.data?.family;
    const prof = ctxQ.data?.profile as { full_name?: string | null; phone?: string | null } | undefined;
    if (fam?.apartment && !senderAddress) setSenderAddress(fam.apartment);
    if (prof?.full_name && !senderName) setSenderName(prof.full_name);
    if (prof?.phone && !senderPhone) setSenderPhone(prof.phone);
  }, [ctxQ.data, senderAddress, senderName, senderPhone]);

  const selectedCourier = COURIERS.find((c) => c.id === courierId)!;
  const estimatedTotal = useMemo(() => {
    let total = selectedCourier.fee;
    if (insurance) total += 10_000;
    if (packHelp) total += 15_000;
    return total;
  }, [selectedCourier.fee, insurance, packHelp]);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          sender_name: senderName.trim(),
          sender_address: senderAddress.trim(),
          sender_phone: senderPhone.trim(),
          recipient_name: recipientName.trim(),
          recipient_address: recipientAddress.trim(),
          recipient_phone: recipientPhone.trim(),
          item_type: itemType,
          weight: weight.trim() || null,
          dimensions: dimensions.trim() || null,
          description: description.trim() || null,
          courier_id: courierId,
          courier_label: selectedCourier.label,
          shipping_fee: selectedCourier.fee,
          insurance,
          pack_help: packHelp,
          notify_recipient: notifyRecipient,
          note: note.trim() || null,
          estimated_total: estimatedTotal,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã đặt dịch vụ gửi hàng", {
        description: `Mã: ${res.ticket_code}. Bảo vệ sẽ liên hệ và lấy hàng tại sảnh.`,
      });
      qc.invalidateQueries({ queryKey: ["package-ships"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setRecipientName("");
      setRecipientAddress("");
      setRecipientPhone("");
      setDescription("");
      setNote("");
    },
    onError: (e: Error) => toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit =
    senderName.trim().length > 0 &&
    senderAddress.trim().length > 0 &&
    senderPhone.trim().length >= 6 &&
    recipientName.trim().length > 0 &&
    recipientAddress.trim().length > 0 &&
    recipientPhone.trim().length >= 6 &&
    !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Gửi hàng đi"
        subtitle="Bảo vệ sẽ hỗ trợ gửi hàng qua đơn vị vận chuyển"
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
              <Send className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold">Gửi hàng nhanh chóng</p>
              <p className="text-xs text-white/80 mt-0.5">An toàn – Tiện lợi</p>
              <p className="text-xs text-white/70 mt-1 leading-snug">
                Bảo vệ sẽ tiếp nhận, đóng gói (nếu cần) và gửi hàng giúp bạn qua đơn vị vận chuyển.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Badge icon={<ShieldCheck className="h-4 w-4" />} label="Tiếp nhận tại sảnh" />
            <Badge icon={<PackageCheck className="h-4 w-4" />} label="Đóng gói cẩn thận" />
            <Badge icon={<Truck className="h-4 w-4" />} label="Gửi qua đơn vị vận chuyển" />
            <Badge icon={<MapPin className="h-4 w-4" />} label="Theo dõi hành trình" />
          </div>
        </RoundedCard>
      </section>

      {/* HISTORY */}
      {showHistory && (
        <section className="px-4 mt-4">
          <SectionHeader title="Lịch sử gửi hàng" subtitle={historyQ.data ? `${historyQ.data.length} yêu cầu` : undefined} />
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
                  <Send className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {h.payload.recipient_name || "—"} • {h.payload.courier_label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("vi-VN")} • {h.payload.ticket_code ?? ""}
                  </p>
                </div>
                <StatusPill status={h.status} />
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      {/* 1. SENDER */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Thông tin người gửi" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<UserIcon className="h-4 w-4 text-brand" />} label="Họ tên người gửi">
            <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="VD: Nguyễn Văn A" className={inputCls} />
          </FormRow>
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa chỉ lấy hàng">
            <input value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} placeholder="VD: Căn hộ A-12A, Toà Sunrise 1" className={inputCls} />
          </FormRow>
          <FormRow icon={<Phone className="h-4 w-4 text-brand" />} label="Số điện thoại">
            <input type="tel" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="VD: 0901 234 567" className={inputCls} />
          </FormRow>
        </RoundedCard>
      </section>

      {/* 2. RECIPIENT */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Thông tin người nhận" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<UserIcon className="h-4 w-4 text-brand" />} label="Người nhận">
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nhập họ tên người nhận" className={inputCls} />
          </FormRow>
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa chỉ nhận hàng">
            <input value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="Nhập địa chỉ chi tiết" className={inputCls} />
          </FormRow>
          <FormRow icon={<Phone className="h-4 w-4 text-brand" />} label="Số điện thoại">
            <input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Nhập số điện thoại" className={inputCls} />
          </FormRow>
        </RoundedCard>
      </section>

      {/* 3. ITEM */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Thông tin hàng hoá" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<Box className="h-4 w-4 text-brand" />} label="Loại hàng hoá">
            <select value={itemType} onChange={(e) => setItemType(e.target.value as ShipItemType)} className={inputCls}>
              {SHIP_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{ITEM_LABELS[t]}</option>
              ))}
            </select>
          </FormRow>
          <FormRow icon={<Scale className="h-4 w-4 text-brand" />} label="Trọng lượng (ước tính)">
            <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="VD: 1.5 kg" className={inputCls} />
          </FormRow>
          <FormRow icon={<Ruler className="h-4 w-4 text-brand" />} label="Kích thước (D × R × C)">
            <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="VD: 30 × 20 × 10 cm" className={inputCls} />
          </FormRow>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Mô tả hàng hoá">
            <input value={description} onChange={(e) => setDescription(e.target.value.slice(0, 200))} placeholder="VD: Sách, quần áo, đồ điện tử…" className={inputCls} />
          </FormRow>
        </RoundedCard>
      </section>

      {/* 4. COURIER */}
      <section className="px-4 mt-5">
        <SectionHeader title="4. Chọn đơn vị vận chuyển" />
        <RoundedCard className="p-2 space-y-1">
          {COURIERS.map((c) => {
            const active = c.id === courierId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCourierId(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition active:scale-[0.98] ${
                  active ? "border-brand bg-tint-blue/40" : "border-transparent bg-card"
                }`}
              >
                <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${active ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"}`}>
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold leading-tight">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                </div>
                <p className={`text-sm font-bold ${active ? "text-brand" : "text-foreground/70"}`}>
                  {c.fee.toLocaleString("vi-VN")}đ
                </p>
                <span className={`ml-2 h-5 w-5 rounded-full border-2 grid place-items-center ${active ? "border-brand bg-brand text-white" : "border-border"}`}>
                  {active && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </RoundedCard>
      </section>

      {/* 5. OPTIONS */}
      <section className="px-4 mt-5">
        <SectionHeader title="5. Tuỳ chọn bổ sung" />
        <RoundedCard className="p-0 divide-y divide-border">
          <ToggleRow
            icon={<ShieldCheck className="h-4 w-4 text-brand" />}
            title="Bảo hiểm hàng hoá"
            desc="Bồi thường 100% nếu mất mát (+10.000đ)"
            checked={insurance}
            onChange={setInsurance}
          />
          <ToggleRow
            icon={<Package className="h-4 w-4 text-brand" />}
            title="Đóng gói hộ"
            desc="Bảo vệ đóng gói giúp bạn (+15.000đ)"
            checked={packHelp}
            onChange={setPackHelp}
          />
          <ToggleRow
            icon={<Bell className="h-4 w-4 text-brand" />}
            title="Thông báo cho người nhận"
            desc="Gửi SMS khi hàng đang trên đường"
            checked={notifyRecipient}
            onChange={setNotifyRecipient}
          />
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Ghi chú thêm">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="Yêu cầu đặc biệt cho bảo vệ…"
              className={`${inputCls} resize-none`}
            />
          </FormRow>
        </RoundedCard>
      </section>

      {/* COST */}
      <section className="px-4 mt-5">
        <SectionHeader title="Tổng chi phí ước tính" />
        <RoundedCard>
          <Row label={`Phí vận chuyển (${selectedCourier.label.split(" ")[0]})`} value={<span className="font-semibold">{selectedCourier.fee.toLocaleString("vi-VN")}đ</span>} />
          {insurance && <Row label="Bảo hiểm hàng hoá" value={<span className="font-semibold">10.000đ</span>} />}
          {packHelp && <Row label="Đóng gói hộ" value={<span className="font-semibold">15.000đ</span>} />}
          <div className="h-px bg-border my-2" />
          <Row
            label={<span className="text-sm font-bold">Tổng cộng</span>}
            value={<span className="text-lg font-extrabold text-brand">{estimatedTotal.toLocaleString("vi-VN")}đ</span>}
          />
          <div className="mt-2 rounded-xl bg-tint-green/40 p-2.5 flex gap-2 items-start">
            <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            <p className="text-[11px] text-foreground/80 leading-snug">
              Hàng hoá sẽ được bảo vệ tiếp nhận tại sảnh và gửi đi trong giờ hành chính. Bạn có thể theo dõi trạng thái trong mục Lịch sử.
            </p>
          </div>
        </RoundedCard>
      </section>

      {/* SPACER */}
      <div className="h-28" />

      {/* ACTION BAR */}
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
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {create.isPending ? "Đang gửi…" : "Xác nhận gửi hàng"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

const inputCls = "w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60";

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
    in_progress: { label: "Đang gửi", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Đã gửi", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>{s.label}</span>;
}
