import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  HelpCircle,
  Box,
  ShieldCheck,
  UserCheck,
  Bike,
  DoorClosed,
  MapPin,
  User as UserIcon,
  Phone,
  FileText,
  Home,
  Scale,
  ChevronRight,
  Loader2,
  Check,
  History,
  ChevronDown,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { requireAuth } from "@/lib/require-auth";
import {
  createRemoteFreight,
  listMyRemoteFreights,
  FREIGHT_ITEM_TYPES,
  FREIGHT_WEIGHTS,
  REMOTE_FREIGHT_BASE_FEE,
  type FreightItemType,
  type FreightWeightId,
} from "@/lib/remote-freight.functions";

export const Route = createFileRoute("/chuyen-hang-tu-xa")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [
      { title: "Chuyển hàng từ xa — STOS Life" },
      {
        name: "description",
        content:
          "Bảo vệ nhận hàng tại địa chỉ của bạn và chuyển đến căn hộ người nhận — an toàn, không cần gặp mặt.",
      },
    ],
  }),
  component: RemoteFreightPage,
});

const ITEM_LABELS: Record<FreightItemType, string> = {
  package: "Bưu kiện / Hàng hoá",
  document: "Tài liệu / Thư",
  fragile: "Hàng dễ vỡ",
  food: "Đồ ăn / Thực phẩm",
  other: "Khác",
};

const STEPS = [
  { icon: Box, label: "Tạo yêu cầu", desc: "Nhập thông tin người gửi & người nhận" },
  { icon: UserCheck, label: "Nhân viên nhận hàng", desc: "Bảo vệ nhận hàng tại địa chỉ của bạn" },
  { icon: Bike, label: "Chuyển hàng", desc: "Hàng được chuyển đến căn hộ người nhận" },
  { icon: DoorClosed, label: "Bàn giao thành công", desc: "Người nhận xác nhận đã nhận hàng" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Đang chờ tiếp nhận",
  in_progress: "Đang xử lý",
  resolved: "Đã hoàn thành",
  cancelled: "Đã huỷ",
};

function fmtVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function RemoteFreightPage() {
  const createFn = useServerFn(createRemoteFreight);
  const listFn = useServerFn(listMyRemoteFreights);
  const qc = useQueryClient();

  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderNote, setSenderNote] = useState("");

  const [apartment, setApartment] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const [itemType, setItemType] = useState<FreightItemType>("package");
  const [weightId, setWeightId] = useState<FreightWeightId>("u1");
  const [itemNote, setItemNote] = useState("");

  const q = useQuery({
    queryKey: ["my-remote-freights"],
    queryFn: () => listFn(),
    staleTime: 15_000,
  });

  const m = useMutation({
    mutationFn: async () => {
      const weight = FREIGHT_WEIGHTS.find((w) => w.id === weightId)!;
      return createFn({
        data: {
          sender_name: senderName.trim(),
          sender_phone: senderPhone.trim(),
          sender_address: senderAddress.trim(),
          sender_note: senderNote.trim() || null,
          apartment: apartment.trim(),
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          item_type: itemType,
          weight_id: weightId,
          weight_label: weight.label,
          item_note: itemNote.trim() || null,
          service_fee: REMOTE_FREIGHT_BASE_FEE,
          estimated_total: REMOTE_FREIGHT_BASE_FEE,
        },
      });
    },
    onSuccess: (r) => {
      toast.success("Đã gửi yêu cầu", { description: `Mã: ${r.ticket_code}` });
      qc.invalidateQueries({ queryKey: ["my-remote-freights"] });
      qc.invalidateQueries({ queryKey: ["my-service-orders"] });
      setSenderName("");
      setSenderPhone("");
      setSenderAddress("");
      setSenderNote("");
      setApartment("");
      setRecipientName("");
      setRecipientPhone("");
      setItemNote("");
    },
    onError: (e) => toast.error("Không gửi được", { description: (e as Error).message }),
  });

  const canSubmit =
    senderName.trim() &&
    senderPhone.trim().length >= 6 &&
    senderAddress.trim() &&
    apartment.trim() &&
    recipientName.trim() &&
    recipientPhone.trim().length >= 6 &&
    !m.isPending;

  function submit() {
    if (!canSubmit) {
      toast.error("Vui lòng điền đủ thông tin bắt buộc");
      return;
    }
    m.mutate();
  }

  return (
    <MobileShell>
      <PageHeader
        title="Chuyển hàng từ xa"
        back="/bao-an"
        right={
          <Link
            to="/bao-an"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            Hướng dẫn
          </Link>
        }
      />

      {/* Hero */}
      <section className="px-4 mt-2">
        <div className="rounded-3xl bg-gradient-to-br from-brand/20 to-pink/20 border border-brand/20 p-5 relative overflow-hidden">
          <div className="max-w-[75%]">
            <p className="text-lg font-bold leading-tight">
              Gửi hàng dễ dàng<br />không cần gặp mặt
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Nhân viên bảo vệ sẽ nhận hàng tại địa chỉ của bạn và chuyển đến
              căn hộ người nhận.
            </p>
          </div>
          <div className="absolute right-3 bottom-3 text-5xl">📦</div>
        </div>
      </section>

      {/* 4 steps */}
      <section className="px-4 mt-6">
        <h2 className="text-[15px] font-semibold mb-4">Quy trình 4 bước</h2>
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-brand/10 grid place-items-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">
                    {i + 1}
                  </span>
                </div>
                <p className="mt-3 text-[11px] font-semibold leading-tight">{s.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sender */}
      <section className="px-4 mt-6">
        <div className="rounded-3xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-brand/10 grid place-items-center">
              <MapPin className="h-4 w-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold">Thông tin người gửi</p>
              <p className="text-[11px] text-muted-foreground">nơi nhận hàng</p>
            </div>
          </div>
          <Field icon={UserIcon} label="Họ tên" value={senderName} onChange={setSenderName} placeholder="Nhập họ tên" />
          <Field icon={Phone} label="Số điện thoại" value={senderPhone} onChange={setSenderPhone} placeholder="Nhập số điện thoại" type="tel" />
          <Field icon={MapPin} label="Địa chỉ nhận hàng" value={senderAddress} onChange={setSenderAddress} placeholder="VD: 123 Nguyễn Huệ, Q.1" />
          <Field icon={FileText} label="Ghi chú cho bảo vệ" value={senderNote} onChange={setSenderNote} placeholder="VD: Gửi ở quầy lễ tân…" maxLength={100} optional />
        </div>
      </section>

      {/* Recipient */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-info/10 grid place-items-center">
              <Home className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-sm font-semibold">Thông tin người nhận</p>
              <p className="text-[11px] text-muted-foreground">tại chung cư</p>
            </div>
          </div>
          <Field icon={Home} label="Căn hộ nhận hàng" value={apartment} onChange={setApartment} placeholder="VD: A-1502" />
          <Field icon={UserIcon} label="Họ tên người nhận" value={recipientName} onChange={setRecipientName} placeholder="Nhập họ tên" />
          <Field icon={Phone} label="Số điện thoại người nhận" value={recipientPhone} onChange={setRecipientPhone} placeholder="Nhập số điện thoại" type="tel" />
        </div>
      </section>

      {/* Item */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-warning/10 grid place-items-center">
              <Box className="h-4 w-4 text-warning" />
            </div>
            <p className="text-sm font-semibold">Thông tin hàng hoá</p>
          </div>

          <SelectField icon={Box} label="Loại hàng hoá">
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as FreightItemType)}
              className="flex-1 bg-transparent text-sm font-medium outline-none appearance-none"
            >
              {FREIGHT_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{ITEM_LABELS[t]}</option>
              ))}
            </select>
          </SelectField>

          <SelectField icon={Scale} label="Trọng lượng ước tính">
            <select
              value={weightId}
              onChange={(e) => setWeightId(e.target.value as FreightWeightId)}
              className="flex-1 bg-transparent text-sm font-medium outline-none appearance-none"
            >
              {FREIGHT_WEIGHTS.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </SelectField>

          <Field icon={FileText} label="Ghi chú về hàng hoá" value={itemNote} onChange={setItemNote} placeholder="VD: Hàng dễ vỡ, cần nhẹ tay…" maxLength={100} optional />
        </div>
      </section>

      {/* Safety */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-brand/5 border border-brand/15 p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand/15 grid place-items-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold">Cam kết an toàn</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Hàng hoá được bảo vệ và chuyển giao cẩn thận bởi đội ngũ bảo vệ chung cư.
            </p>
          </div>
        </div>
      </section>

      {/* History */}
      {(q.data?.length ?? 0) > 0 && (
        <section className="px-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Lịch sử yêu cầu</h2>
          </div>
          <div className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden">
            {(q.data ?? []).slice(0, 5).map((r) => (
              <div key={r.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand/10 grid place-items-center shrink-0">
                  <Box className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">→ {r.payload.apartment}</p>
                  <p className="text-[11px] text-muted-foreground truncate font-mono">
                    {r.payload.ticket_code} · {fmtTime(r.created_at)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-brand shrink-0">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Spacer for fixed bar */}
      <div className="h-32" />

      {/* Fixed action bar */}
      <div className="fixed bottom-[72px] left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
        <div className="max-w-[var(--shell-max,30rem)] mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Phí dịch vụ</p>
            <p className="text-xl font-bold text-brand">{fmtVND(REMOTE_FREIGHT_BASE_FEE)}</p>
          </div>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="h-12 px-6 rounded-2xl bg-brand text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] transition"
          >
            {m.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Xác nhận yêu cầu
              </>
            )}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  optional,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  optional?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
          {optional && <span className="text-[10px] text-muted-foreground">(tuỳ chọn)</span>}
        </div>
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      {maxLength && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {value.length}/{maxLength}
        </span>
      )}
    </label>
  );
}

function SelectField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center">
          {children}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </div>
  );
}
