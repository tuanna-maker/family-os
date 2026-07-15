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
  FileText,
  Loader2,
  History,
  Check,
  Minus,
  Plus,
  Car,
  HelpCircle,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createHourlyGuard,
  listMyHourlyGuard,
  HOURLY_GUARD_RATE,
  HOURLY_GUARD_DURATIONS,
} from "@/lib/hourly-guard.functions";

export const Route = createFileRoute("/bao-ve-theo-gio")({
  head: () => ({
    meta: [
      { title: "Đặt dịch vụ bảo vệ theo giờ — STOS Life" },
      {
        name: "description",
        content:
          "Đặt bảo vệ theo giờ tại căn hộ: linh hoạt khung giờ, có mặt nhanh chóng, chuyên nghiệp.",
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
  component: HourlyGuardPage,
});

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function addHours(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const total = (h * 60 + m + hours * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function HourlyGuardPage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createHourlyGuard);
  const listFn = useServerFn(listMyHourlyGuard);

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getCtx(),
    staleTime: 5 * 60_000,
  });
  const historyQ = useQuery({
    queryKey: ["hourly-guard"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const [serviceDate, setServiceDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("14:00");
  const [hours, setHours] = useState<number>(4);
  const [apartment, setApartment] = useState("");
  const [description, setDescription] = useState("");
  const [guardCount, setGuardCount] = useState(1);
  const [equipment, setEquipment] = useState(true);
  const [extraNotes, setExtraNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fam = ctxQ.data?.family;
    if (fam?.apartment && !apartment) setApartment(fam.apartment);
  }, [ctxQ.data, apartment]);

  const endTime = useMemo(() => addHours(startTime, hours), [startTime, hours]);
  const total = HOURLY_GUARD_RATE * hours * guardCount;

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          service_date: serviceDate,
          start_time: startTime,
          end_time: endTime,
          hours,
          apartment: apartment.trim(),
          description: description.trim() || null,
          guard_count: guardCount,
          equipment_support: equipment,
          extra_notes: extraNotes.trim() || null,
          unit_price: HOURLY_GUARD_RATE,
          estimated_total: total,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã đặt dịch vụ bảo vệ theo giờ", {
        description: `Mã: ${res.ticket_code}. Bảo an sẽ xác nhận trong ít phút.`,
      });
      qc.invalidateQueries({ queryKey: ["hourly-guard"] });
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
        title="Đặt dịch vụ bảo vệ theo giờ"
        subtitle="Linh hoạt – An toàn – Chuyên nghiệp"
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
                Bảo vệ theo giờ
              </p>
              <p className="text-xs text-foreground/70 mt-1">
                Linh hoạt – An toàn – Chuyên nghiệp
              </p>
              <ul className="mt-2 space-y-1 text-[12px] text-foreground/80">
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-brand mt-0.5" /> Bảo vệ chuyên nghiệp</li>
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-brand mt-0.5" /> Có mặt nhanh chóng</li>
                <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-brand mt-0.5" /> Linh hoạt theo nhu cầu</li>
              </ul>
            </div>
          </div>
        </RoundedCard>
      </section>

      {/* HISTORY */}
      {showHistory && (
        <section className="px-4 mt-4">
          <SectionHeader
            title="Lịch sử đặt"
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
            {(historyQ.data ?? []).map((h) => (
              <div key={h.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-brand/15 grid place-items-center shrink-0">
                  <Clock className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {h.payload.service_date} · {h.payload.start_time}–{h.payload.end_time}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {h.payload.guard_count} bảo vệ ·{" "}
                    {(h.payload.estimated_total ?? 0).toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <StatusPill status={h.status} />
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      {/* 1. TIME */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Chọn thời gian" />
        <RoundedCard className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chọn ngày" icon={<Calendar className="h-4 w-4 text-brand" />}>
              <input
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </Field>
            <Field label="Giờ bắt đầu" icon={<Clock className="h-4 w-4 text-brand" />}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </Field>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1.5">
              Số giờ sử dụng
            </p>
            <div className="grid grid-cols-4 gap-2">
              {HOURLY_GUARD_DURATIONS.map((h) => {
                const active = h === hours;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`h-11 rounded-2xl border text-sm font-bold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                      active
                        ? "bg-brand text-white border-brand shadow-[var(--shadow-pop)]"
                        : "bg-card border-border text-foreground"
                    }`}
                  >
                    {h} giờ {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl bg-brand/10 px-3 py-2.5 flex items-center gap-2 text-xs font-semibold text-brand">
            <Clock className="h-4 w-4" />
            Thời gian: {startTime} – {endTime} · Tổng {hours} giờ
          </div>
        </RoundedCard>
      </section>

      {/* 2. LOCATION */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Địa điểm sử dụng dịch vụ" />
        <RoundedCard>
          <label className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-tint-blue grid place-items-center shrink-0">
              <MapPin className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">
                Chọn căn hộ / địa điểm
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

      {/* 3. DESCRIPTION */}
      <section className="px-4 mt-5">
        <SectionHeader title="3. Mô tả yêu cầu" subtitle="(tuỳ chọn)" />
        <RoundedCard>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Nhập mô tả yêu cầu công việc cho bảo vệ…"
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {description.length}/200
          </p>
        </RoundedCard>
      </section>

      {/* 4. EXTRAS */}
      <section className="px-4 mt-5">
        <SectionHeader title="4. Thông tin bổ sung" />
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
                onClick={() => setGuardCount((n) => Math.min(10, n + 1))}
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
              Bộ đàm, đèn pin, dùi cui…
            </p>
          </button>

          {/* Yêu cầu khác */}
          <label className="rounded-2xl bg-card border border-border p-3 block cursor-text">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-7 w-7 rounded-lg bg-muted grid place-items-center">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[11px] font-bold leading-tight">Yêu cầu khác</p>
            </div>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Ghi chú thêm…"
              className="w-full bg-transparent text-[10px] outline-none resize-none placeholder:text-muted-foreground/60 leading-snug"
            />
          </label>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="px-4 mt-5">
        <RoundedCard className="bg-muted/40">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <p className="text-[11px] text-muted-foreground">Tổng thời gian</p>
              <p className="text-sm font-extrabold text-brand">{hours} giờ</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Số lượng</p>
              <p className="text-sm font-extrabold text-brand">{guardCount} người</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Tạm tính</p>
              <p className="text-base font-extrabold text-brand leading-tight">
                {total.toLocaleString("vi-VN")}đ
              </p>
              <p className="text-[10px] text-muted-foreground">
                ({HOURLY_GUARD_RATE.toLocaleString("vi-VN")}đ/giờ)
              </p>
            </div>
          </div>
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
            className="w-full h-14 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-bold flex items-center justify-center gap-2 text-base shadow-[var(--shadow-pop)] active:scale-[0.98] transition disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            {create.isPending ? "Đang gửi…" : "Xác nhận đặt dịch vụ"}
          </button>
        </div>
      </div>

      <div className="px-4 mt-2 flex justify-center">
        <Link
          to="/bao-an"
          className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
        >
          <HelpCircle className="h-3 w-3" /> Cần hướng dẫn? Liên hệ bảo an
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
