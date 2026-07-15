import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  KeyRound,
  PawPrint,
  Leaf,
  Home,
  FileText,
  MoreHorizontal,
  MapPin,
  Clock,
  MessageSquare,
  Loader2,
  History,
  Check,
  Headphones,
  Plane,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  createGuardHandle,
  listMyGuardHandle,
  GUARD_TASKS,
  GUARD_HANDLE_BASE_FEE,
  type GuardTaskId,
} from "@/lib/guard-handle.functions";

export const Route = createFileRoute("/bao-ve-xu-ly-ho")({
  head: () => ({
    meta: [
      { title: "Bảo vệ hỗ trợ khi vắng nhà — STOS Life" },
      {
        name: "description",
        content:
          "Khi bạn đi vắng, bảo vệ toà nhà sẽ hỗ trợ mở cửa, chăm thú cưng, tưới cây, kiểm tra căn hộ và lấy hộ giấy tờ.",
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
  component: GuardHandlePage,
});

const TASK_META: Record<GuardTaskId, { icon: typeof KeyRound; tint: string; color: string; hint: string }> = {
  door: { icon: KeyRound, tint: "bg-brand/15", color: "text-brand", hint: "Hỗ trợ mở cửa căn hộ khi bạn quên/mất chìa khoá. Cần xác minh chủ căn hộ." },
  pet: { icon: PawPrint, tint: "bg-pink/15", color: "text-pink", hint: "Cho ăn, thay nước, dắt đi vệ sinh ngắn quanh toà nhà." },
  plant: { icon: Leaf, tint: "bg-success/15", color: "text-success", hint: "Tưới cây trong căn hộ theo lịch hoặc một lần." },
  inspect: { icon: Home, tint: "bg-info/15", color: "text-info", hint: "Kiểm tra điện/nước/khoá cửa, gửi ảnh tình trạng căn hộ." },
  fetch: { icon: FileText, tint: "bg-warning/15", color: "text-warning", hint: "Lấy giấy tờ, đồ cá nhân từ căn hộ và bàn giao theo chỉ định." },
  other: { icon: MoreHorizontal, tint: "bg-muted", color: "text-muted-foreground", hint: "Việc khác — mô tả rõ ở phần ghi chú." },
};

function GuardHandlePage() {
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const createFn = useServerFn(createGuardHandle);
  const listFn = useServerFn(listMyGuardHandle);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const historyQ = useQuery({ queryKey: ["guard-handle"], queryFn: () => listFn(), staleTime: 30_000 });

  const [taskId, setTaskId] = useState<GuardTaskId>("door");
  const [apartment, setApartment] = useState("");
  const [awayFrom, setAwayFrom] = useState("");
  const [awayTo, setAwayTo] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fam = ctxQ.data?.family;
    if (fam?.apartment && !apartment) setApartment(fam.apartment);
  }, [ctxQ.data, apartment]);

  const task = GUARD_TASKS.find((t) => t.id === taskId)!;
  const taskFee = task.fee ?? GUARD_HANDLE_BASE_FEE;
  const total = taskFee;

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          task_id: taskId,
          task_label: task.label,
          apartment: apartment.trim(),
          desired_time:
            desiredTime.trim() ||
            (awayFrom || awayTo ? `Vắng nhà: ${awayFrom || "?"} → ${awayTo || "?"}` : null),
          description: description.trim() || null,
          note: note.trim() || null,
          service_fee: taskFee,
          estimated_total: total,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã gửi yêu cầu cho bảo vệ", {
        description: `Mã: ${res.ticket_code}. Bảo vệ sẽ liên hệ xác nhận trong ít phút.`,
      });
      qc.invalidateQueries({ queryKey: ["guard-handle"] });
      qc.invalidateQueries({ queryKey: ["security-requests"] });
      setDescription("");
      setNote("");
    },
    onError: (e: Error) => toast.error("Không gửi được", { description: e.message }),
  });

  const canSubmit =
    apartment.trim().length > 0 && description.trim().length > 0 && !create.isPending;

  return (
    <MobileShell>
      <PageHeader
        back="/bao-an"
        eyebrow="Bảo An"
        title="Bảo vệ hỗ trợ khi vắng nhà"
        subtitle="Đi công tác, du lịch? Để bảo vệ chăm lo căn hộ giúp bạn"
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
        <RoundedCard className="bg-gradient-to-br from-brand/15 via-info/10 to-brand/5 border-border">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white grid place-items-center shrink-0 shadow-[var(--shadow-pop)]">
              <Plane className="h-7 w-7 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">Yên tâm đi vắng, mọi việc có bảo vệ</p>
              <p className="text-xs text-foreground/70 mt-1">
                Mở cửa quên khoá, tưới cây, chăm thú cưng, kiểm tra căn hộ, lấy hộ giấy tờ.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Badge icon={<ShieldCheck className="h-4 w-4 text-brand" />} label="Xác minh chủ hộ" />
            <Badge icon={<Clock className="h-4 w-4 text-brand" />} label="Phản hồi nhanh" />
            <Badge icon={<Check className="h-4 w-4 text-brand" />} label="Ảnh báo cáo" />
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
            {(historyQ.data ?? []).map((h) => {
              const meta = TASK_META[h.payload.task_id as GuardTaskId] ?? TASK_META.other;
              const Icon = meta.icon;
              return (
                <div key={h.id} className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-2xl grid place-items-center shrink-0 ${meta.tint}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{h.payload.task_label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {h.payload.desired_time || new Date(h.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <StatusPill status={h.status} />
                </div>
              );
            })}
          </RoundedCard>
        </section>
      )}

      {/* 1. TASK GRID */}
      <section className="px-4 mt-5">
        <SectionHeader title="1. Chọn dịch vụ cần hỗ trợ" />
        <div className="grid grid-cols-3 gap-2">
          {GUARD_TASKS.map((t) => {
            const meta = TASK_META[t.id];
            const Icon = meta.icon;
            const active = t.id === taskId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTaskId(t.id)}
                className={`rounded-2xl p-3 border text-center transition active:scale-[0.97] ${
                  active ? "border-brand bg-tint-blue/40 shadow-[var(--shadow-pop)]" : "border-border bg-card"
                }`}
              >
                <div className={`mx-auto h-11 w-11 rounded-xl grid place-items-center ${active ? meta.tint : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${active ? meta.color : "text-muted-foreground"}`} />
                </div>
                <p className="text-[11px] font-bold mt-2 leading-tight">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.fee.toLocaleString("vi-VN")}đ</p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 px-1">{TASK_META[taskId].hint}</p>
      </section>

      {/* 2. REQUEST INFO */}
      <section className="px-4 mt-5">
        <SectionHeader title="2. Thông tin yêu cầu" />
        <RoundedCard className="p-0 divide-y divide-border">
          <FormRow icon={<MapPin className="h-4 w-4 text-brand" />} label="Địa chỉ căn hộ">
            <input
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder="VD: A12A - Tầng 12 - Căn 05"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<Plane className="h-4 w-4 text-brand" />} label="Thời gian đi vắng (tuỳ chọn)">
            <div className="flex items-center gap-2">
              <input
                value={awayFrom}
                onChange={(e) => setAwayFrom(e.target.value)}
                placeholder="Từ: 26/05 09:00"
                className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
              <span className="text-muted-foreground">→</span>
              <input
                value={awayTo}
                onChange={(e) => setAwayTo(e.target.value)}
                placeholder="Đến: 28/05 18:00"
                className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </FormRow>
          <FormRow icon={<Clock className="h-4 w-4 text-brand" />} label="Thời điểm cần thực hiện">
            <input
              value={desiredTime}
              onChange={(e) => setDesiredTime(e.target.value)}
              placeholder="VD: Mỗi ngày 18:00 / Ngay bây giờ"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={<FileText className="h-4 w-4 text-brand" />} label="Mô tả chi tiết yêu cầu">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={taskHintPlaceholder(taskId)}
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{description.length}/500</p>
          </FormRow>
          <FormRow icon={<MessageSquare className="h-4 w-4 text-brand" />} label="Ghi chú thêm (tuỳ chọn)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="VD: Mã cửa, vị trí chìa, lưu ý vật nuôi…"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60 resize-none"
            />
          </FormRow>
        </RoundedCard>
      </section>

      {/* COMMITMENT */}
      <section className="px-4 mt-4">
        <RoundedCard className="bg-tint-green/40 border-success/20">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white grid place-items-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Cam kết của chúng tôi</p>
              <ul className="mt-1.5 grid grid-cols-1 gap-1 text-[11px] text-foreground/80">
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Xác minh chủ căn hộ trước khi vào</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Camera ghi hình toàn bộ quá trình</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" /> Báo cáo kèm ảnh sau khi hoàn tất</li>
              </ul>
            </div>
          </div>
        </RoundedCard>
      </section>

      {/* SPACER */}
      <div className="h-28" />

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-background/95 backdrop-blur-xl border border-border shadow-[var(--shadow-pop)] p-3 flex items-center gap-3 pointer-events-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium">Tổng chi phí ước tính</p>
            <p className="text-lg font-extrabold text-brand leading-tight">
              {total.toLocaleString("vi-VN")}đ
              <span className="text-[10px] font-medium text-muted-foreground ml-1">(Đã gồm VAT)</span>
            </p>
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="h-12 px-5 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {create.isPending ? "Đang gửi…" : "Xác nhận yêu cầu"}
          </button>
        </div>
      </div>

      <div className="px-4 mt-2 flex justify-center">
        <Link to="/bao-an" className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Headphones className="h-3 w-3" /> Cần tư vấn? Liên hệ bảo an
        </Link>
      </div>
    </MobileShell>
  );
}

function taskHintPlaceholder(id: GuardTaskId): string {
  switch (id) {
    case "door":
      return "VD: Quên khoá ngoài, cần bảo vệ qua mở giúp lúc 19:00…";
    case "pet":
      return "VD: Mèo Anh lông ngắn, cho ăn 100g hạt + thay nước, sáng/tối…";
    case "plant":
      return "VD: 4 chậu cây ban công, tưới mỗi chậu ~200ml, cách 2 ngày…";
    case "inspect":
      return "VD: Kiểm tra khoá cửa, tắt aptomat máy lạnh, gửi ảnh phòng khách…";
    case "fetch":
      return "VD: Lấy hộ chứng minh thư trong ngăn kéo bàn làm việc, giao cho anh A…";
    default:
      return "Nhập mô tả chi tiết công việc cần bảo vệ hỗ trợ…";
  }
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-2 flex flex-col items-center gap-1 text-center border border-border">
      <div className="h-7 w-7 rounded-xl bg-brand/10 grid place-items-center">{icon}</div>
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Đang chờ", cls: "bg-tint-orange text-warning" },
    in_progress: { label: "Đang xử lý", cls: "bg-tint-blue text-brand" },
    resolved: { label: "Hoàn tất", cls: "bg-tint-green text-success" },
    cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.cls}`}>{s.label}</span>;
}
