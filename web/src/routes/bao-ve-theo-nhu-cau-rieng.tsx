import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Clock,
  Calendar,
  MapPin,
  Loader2,
  History,
  Check,
  Minus,
  Plus,
  Car,
  HelpCircle,
  UserCheck,
  DoorOpen,
  PartyPopper,
  Shield,
  MoreHorizontal,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createCustomGuard,
  listMyCustomGuard,
  CUSTOM_GUARD_SERVICES,
  CUSTOM_GUARD_BASE_FEE,
  CUSTOM_GUARD_PER_GUARD,
  type CustomGuardServiceId,
} from "@/lib/custom-guard.functions";

export const Route = createFileRoute("/bao-ve-theo-nhu-cau-rieng")({
  head: () => ({
    meta: [
      { title: "Bảo vệ theo nhu cầu riêng — STOS Life" },
      {
        name: "description",
        content:
          "Thiết kế dịch vụ bảo vệ phù hợp với nhu cầu riêng của bạn: tuần tra, kiểm soát ra vào, bảo vệ sự kiện, an ninh tài sản.",
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: CustomGuardPage,
});

const SERVICE_ICONS: Record<CustomGuardServiceId, React.ComponentType<{ className?: string }>> = {
  patrol: UserCheck,
  access: DoorOpen,
  event: PartyPopper,
  asset: Shield,
  other: MoreHorizontal,
};

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function CustomGuardPage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createCustomGuard);
  const listFn = useServerFn(listMyCustomGuard);

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getCtx(),
    staleTime: 5 * 60_000,
  });
  const historyQ = useQuery({
    queryKey: ["custom-guard"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const [startAt, setStartAt] = useState(todayStr());
  const [endAt, setEndAt] = useState("");
  const [apartment, setApartment] = useState("");
  const [serviceId, setServiceId] = useState<CustomGuardServiceId>("patrol");
  const [description, setDescription] = useState("");
  const [guardCount, setGuardCount] = useState(1);
  const [equipment, setEquipment] = useState(true);
  const [vehicle, setVehicle] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fam = ctxQ.data?.family;
    if (fam?.apartment && !apartment) setApartment(fam.apartment);
  }, [ctxQ.data, apartment]);

  const estimated = useMemo(
    () => CUSTOM_GUARD_BASE_FEE + guardCount * CUSTOM_GUARD_PER_GUARD,
    [guardCount],
  );

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          service_id: serviceId,
          start_at: startAt,
          end_at: endAt.trim() || null,
          apartment: apartment.trim(),
          description: description.trim() || null,
          guard_count: guardCount,
          equipment_support: equipment,
          vehicle_support: vehicle,
          extra_notes: extraNotes.trim() || null,
          estimated_total: estimated,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã gửi yêu cầu bảo vệ theo nhu cầu riêng", {
        description: `Mã: ${res.ticket_code}. Bảo an sẽ liên hệ xác nhận sớm.`,
      });
      qc.invalidateQueries({ queryKey: ["custom-guard"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setDescription("");
      setExtraNotes("");
    },
    onError: (e: Error) =>
      toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit = apartment.trim().length > 0 && !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Bảo vệ theo nhu cầu riêng"
        subtitle="Thiết kế dịch vụ phù hợp với nhu cầu của bạn"
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
        <RoundedCard className="bg-gradient-to-br from-brand/15 via-pink/10 to-brand/5 border-border">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white grid place-items-center shrink-0 shadow-[var(--shadow-pop)]">
              <ShieldCheck className="h-7 w-7 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight text-brand">
                Dịch vụ bảo vệ
              </p>
              <p className="text-lg font-extrabold leading-tight text-brand">
                theo nhu cầu riêng
              </p>
              <p className="text-xs text-foreground/70 mt-1">
                Linh hoạt thiết kế gói dịch vụ phù hợp với yêu cầu riêng của bạn.
              </p>
              <ul className="mt-2 space-y-1 text-[12px] text-foreground/80">
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-brand mt-0.5" /> Linh hoạt</li>
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-brand mt-0.5" /> Chuyên nghiệp</li>
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-brand mt-0.5" /> An toàn tuyệt đối</li>
              </ul>
            </div>
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
              <div className="p-6 text-center text-sm text-muted-foreground">
                Chưa có yêu cầu nào.
              </div>
            )}
            {(historyQ.data ?? []).map((h) => {
              const svc = CUSTOM_GUARD_SERVICES.find((s) => s.id === h.payload.service_id);
              return (
                <div key={h.id} className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-brand/15 grid place-items-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {svc?.label ?? "Bảo vệ riêng"} · {h.payload.start_at}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {h.payload.guard_count} bảo vệ ·{" "}
                      {(h.payload.estimated_total ?? 0).toLocaleString("vi-VN")}đ
                    </p>
                  </div>
                  <StatusPill status={h.status} />
                </div>
              );
            })}
          </RoundedCard>
        </section>
      )}

      {/* 1. TIME + LOCATION */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Chọn thời gian & địa điểm" />
        <RoundedCard className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thời gian bắt đầu" icon={<Calendar className="h-4 w-4 text-brand" />}>
              <input
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                placeholder="dd/mm/yyyy HH:mm"
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </Field>
            <Field label="Thời gian kết thúc" icon={<Clock className="h-4 w-4 text-brand" />}>
              <input
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                placeholder="Chọn thời gian"
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </Field>
          </div>
          <label className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-tint-blue grid place-items-center shrink-0">
              <MapPin className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">
                Địa điểm sử dụng dịch vụ
              </p>
              <input
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="VD: A12A – Tầng 12 – Căn 05"
                className="w-full mt-0.5 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </label>
        </RoundedCard>
      </section>

      {/* 2. SERVICE TYPE */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Chọn yêu cầu dịch vụ" />
        <div className="grid grid-cols-3 gap-2">
          {CUSTOM_GUARD_SERVICES.map((s) => {
            const Icon = SERVICE_ICONS[s.id];
            const active = s.id === serviceId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={`rounded-2xl border p-3 text-center transition active:scale-95 ${
                  active
                    ? "bg-brand/5 border-brand shadow-[var(--shadow-pop)]"
                    : "bg-card border-border"
                }`}
              >
                <div className="relative h-10 w-10 mx-auto rounded-xl bg-brand/15 grid place-items-center">
                  <Icon className="h-5 w-5 text-brand" />
                  {active && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand grid place-items-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-bold leading-tight">{s.label}</p>
              </button>
            );
          })}
        </div>
        <RoundedCard className="mt-3">
          <p className="text-[11px] text-muted-foreground font-medium mb-1">
            Mô tả chi tiết yêu cầu của bạn
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="Ví dụ: Tuần tra khu vực tầng hầm, sảnh, hành lang…"
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {description.length}/300
          </p>
        </RoundedCard>
      </section>

      {/* 3. EXTRAS */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Tùy chọn bổ sung" />
        <div className="grid grid-cols-3 gap-2">
          {/* Số lượng */}
          <div className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-7 w-7 rounded-lg bg-brand/15 grid place-items-center">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              </div>
              <p className="text-[11px] font-bold leading-tight">Số lượng bảo vệ</p>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setGuardCount((n) => Math.max(1, n - 1))}
                className="h-7 w-7 rounded-full bg-muted grid place-items-center"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-base font-extrabold">{guardCount}</span>
              <button
                type="button"
                onClick={() => setGuardCount((n) => Math.min(20, n + 1))}
                className="h-7 w-7 rounded-full bg-brand text-white grid place-items-center"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Trang bị */}
          <button
            type="button"
            onClick={() => setEquipment((v) => !v)}
            className={`rounded-2xl border p-3 text-left transition ${
              equipment
                ? "bg-brand/5 border-brand shadow-[var(--shadow-pop)]"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-7 w-7 rounded-lg bg-brand/15 grid place-items-center">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              </div>
              <p className="text-[11px] font-bold leading-tight flex-1">
                Trang bị hỗ trợ
              </p>
              {equipment && (
                <div className="h-4 w-4 rounded-full bg-brand grid place-items-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Bộ đàm, đèn pin, gậy an ninh, camera…
            </p>
          </button>

          {/* Phương tiện */}
          <button
            type="button"
            onClick={() => setVehicle((v) => !v)}
            className={`rounded-2xl border p-3 text-left transition ${
              vehicle
                ? "bg-brand/5 border-brand shadow-[var(--shadow-pop)]"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-7 w-7 rounded-lg bg-muted grid place-items-center">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[11px] font-bold leading-tight flex-1">
                Phương tiện hỗ trợ
              </p>
              {vehicle && (
                <div className="h-4 w-4 rounded-full bg-brand grid place-items-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Xe máy, ô tô (nếu cần)
            </p>
          </button>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="px-4 mt-5">
        <RoundedCard className="bg-brand/5 border-brand/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand">Ước tính chi phí</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Chi phí sẽ được tính toán dựa trên yêu cầu chi tiết của bạn.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-extrabold text-brand leading-tight">
                {estimated.toLocaleString("vi-VN")}đ
              </p>
              <p className="text-[10px] text-muted-foreground">(Ước tính)</p>
            </div>
          </div>
        </RoundedCard>
      </section>

      {/* 4. NOTES */}
      <section className="px-4 mt-5">
        <SectionHeader title="4. Ghi chú thêm" subtitle="(tuỳ chọn)" />
        <RoundedCard>
          <textarea
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Ghi chú thêm cho bảo vệ…"
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {extraNotes.length}/200
          </p>
        </RoundedCard>
      </section>

      <div className="h-28" />

      {/* BOTTOM ACTION */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="w-full h-14 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-bold flex flex-col items-center justify-center gap-0.5 text-base shadow-[var(--shadow-pop)] active:scale-[0.98] transition disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              {create.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              {create.isPending ? "Đang gửi…" : "Tiếp tục"}
            </span>
            <span className="text-[10px] font-medium text-white/80">
              Xác nhận & thanh toán ở bước tiếp theo.
            </span>
          </button>
        </div>
      </div>

      <div className="px-4 mt-2 flex justify-center">
        <Link
          to="/bao-an"
          className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
        >
          <HelpCircle className="h-3 w-3" /> Hướng dẫn? Liên hệ bảo an
        </Link>
      </div>
    </MobileShell>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-2.5">
      <p className="text-[10px] text-muted-foreground font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Đang chờ", cls: "bg-tint-orange text-warning" },
    in_progress: { label: "Đang xử lý", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Hoàn tất", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>
      {s.label}
    </span>
  );
}
