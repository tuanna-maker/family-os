import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone, Plus, ShieldCheck, QrCode, Package, Lock, AlertTriangle,
  CheckCircle2, Star, Activity, Loader2, Trash2, X,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listHelpers, getHelperData, createHelper, updateHelper, deleteHelper,
  addTask, toggleTask, deleteTask, setAttendance, addPayment, togglePayment, logActivity,
  type HelperRow,
} from "@/lib/family-helpers.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

export const Route = createFileRoute("/quan-ly-giup-viec")({
  head: () => ({
    meta: [
      { title: "Quản lý giúp việc — STOS Life" },
      { name: "description", content: "Hồ sơ, lịch, phân quyền, checklist và lương người giúp việc." },
    ],
  }),
  component: HelperPage,
});

function HelperPage() {
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading) {
    return <MobileShell><PageHeader eyebrow="Family Core" back="/gia-dinh" title="Quản lý giúp việc" emoji="🧑‍🍳" />
      <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div></MobileShell>;
  }
  if (!familyId) {
    return <MobileShell><PageHeader eyebrow="Family Core" back="/gia-dinh" title="Quản lý giúp việc" emoji="🧑‍🍳" />
      <section className="px-4 mt-2"><RoundedCard className="text-center py-6 text-sm text-muted-foreground">Bạn cần tham gia một gia đình.</RoundedCard></section></MobileShell>;
  }
  return <HelperContent familyId={familyId} />;
}

function HelperContent({ familyId }: { familyId: string }) {
  const listFn = useServerFn(listHelpers);
  const createFn = useServerFn(createHelper);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["family-helpers", familyId], queryFn: () => listFn({ data: { familyId } }) });

  const createM = useMutation({
    mutationFn: (v: any) => createFn({ data: { familyId, ...v } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["family-helpers", familyId] }); setAdding(false); setSelectedId(r.id); toast.success("Đã thêm người giúp việc"); },
    onError: (e) => toast.error("Không tạo được", { description: (e as Error).message }),
  });

  const helpers = q.data ?? [];
  const selected = selectedId ? helpers.find((h) => h.id === selectedId) : helpers[0];

  if (q.isLoading) {
    return <MobileShell><PageHeader eyebrow="Family Core" back="/gia-dinh" title="Quản lý giúp việc" emoji="🧑‍🍳" />
      <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div></MobileShell>;
  }

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" back="/gia-dinh" title="Quản lý giúp việc"
        subtitle="Phân công, phân quyền, theo dõi minh bạch" emoji="🧑‍🍳" />

      {helpers.length > 1 && (
        <section className="px-4 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {helpers.map((h) => (
              <button key={h.id} onClick={() => setSelectedId(h.id)}
                className={cn("shrink-0 px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5",
                  selected?.id === h.id ? "bg-brand text-white" : "bg-card border border-border")}>
                <span>{h.avatar}</span>{h.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {adding && (
        <section className="px-4 mt-3">
          <NewHelperForm onCancel={() => setAdding(false)} onSubmit={(v) => createM.mutate(v)} saving={createM.isPending} />
        </section>
      )}

      {!selected && !adding ? (
        <section className="px-4 mt-5">
          <RoundedCard className="text-center py-8 space-y-3">
            <div className="text-4xl">🧑‍🍳</div>
            <p className="text-sm text-muted-foreground">Chưa có người giúp việc nào.</p>
            <button onClick={() => setAdding(true)} className="px-4 py-2 rounded-2xl bg-brand text-white text-sm font-bold inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Thêm người giúp việc
            </button>
          </RoundedCard>
        </section>
      ) : selected ? (
        <HelperDetail helper={selected} onAdd={() => setAdding(true)} onDeleted={() => { setSelectedId(null); qc.invalidateQueries({ queryKey: ["family-helpers", familyId] }); }} />
      ) : null}
    </MobileShell>
  );
}

function NewHelperForm({ onCancel, onSubmit, saving }: { onCancel: () => void; onSubmit: (v: any) => void; saving: boolean }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Giúp việc gia đình");
  const [phone, setPhone] = useState("");
  const [hometown, setHometown] = useState("");
  const [salary, setSalary] = useState(0);
  return (
    <RoundedCard className="space-y-3">
      <p className="font-bold text-sm">Thêm người giúp việc</p>
      <Field label="Họ tên *" value={name} onChange={setName} />
      <Field label="Vai trò" value={role} onChange={setRole} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="SĐT" value={phone} onChange={setPhone} type="tel" />
        <Field label="Quê" value={hometown} onChange={setHometown} />
      </div>
      <Field label="Lương/tháng (₫)" value={String(salary)} onChange={(v) => setSalary(Number(v) || 0)} type="number" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-semibold">Huỷ</button>
        <button disabled={!name.trim() || saving}
          onClick={() => onSubmit({ name: name.trim(), role, phone, hometown, salary })}
          className="flex-1 py-2.5 rounded-2xl bg-brand text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Tạo
        </button>
      </div>
    </RoundedCard>
  );
}

const attTone: Record<string, string> = {
  present: "bg-success text-white",
  leave: "bg-warning text-white",
  absent: "bg-muted text-muted-foreground",
};
const ATT_CYCLE = ["present", "leave", "absent"] as const;

function HelperDetail({ helper, onAdd, onDeleted }: { helper: HelperRow; onAdd: () => void; onDeleted: () => void }) {
  const getFn = useServerFn(getHelperData);
  const updateFn = useServerFn(updateHelper);
  const deleteFn = useServerFn(deleteHelper);
  const addTaskFn = useServerFn(addTask);
  const toggleTaskFn = useServerFn(toggleTask);
  const delTaskFn = useServerFn(deleteTask);
  const setAttFn = useServerFn(setAttendance);
  const addPayFn = useServerFn(addPayment);
  const togglePayFn = useServerFn(togglePayment);
  const logFn = useServerFn(logActivity);
  const qc = useQueryClient();
  const [showQR, setShowQR] = useState(false);
  const [newTask, setNewTask] = useState("");

  const dataQ = useQuery({ queryKey: ["helper-data", helper.id], queryFn: () => getFn({ data: { helperId: helper.id } }) });
  const inv = () => qc.invalidateQueries({ queryKey: ["helper-data", helper.id] });
  const invHelper = () => qc.invalidateQueries({ queryKey: ["family-helpers", helper.family_id] });

  const togglePermM = useMutation({
    mutationFn: (perms: HelperRow["permissions"]) => updateFn({ data: { id: helper.id, permissions: perms } }),
    onSuccess: invHelper,
  });
  const addTaskM = useMutation({ mutationFn: (title: string) => addTaskFn({ data: { helper_id: helper.id, title } }), onSuccess: inv });
  const toggleTaskM = useMutation({ mutationFn: (v: { id: string; done: boolean }) => toggleTaskFn({ data: v }), onSuccess: inv });
  const delTaskM = useMutation({ mutationFn: (id: string) => delTaskFn({ data: { id } }), onSuccess: inv });
  const setAttM = useMutation({
    mutationFn: (v: { att_date: string; status: "present" | "leave" | "absent" }) => setAttFn({ data: { helper_id: helper.id, ...v } }),
    onSuccess: inv,
  });
  const togglePayM = useMutation({ mutationFn: (v: { id: string; status: "paid" | "pending" }) => togglePayFn({ data: v }), onSuccess: inv });
  const addPayM = useMutation({
    mutationFn: () => {
      const now = new Date();
      const m = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
      return addPayFn({ data: { helper_id: helper.id, month: m, amount: Number(helper.salary), status: "pending" } });
    },
    onSuccess: () => { inv(); toast.success("Đã tạo phiếu lương"); },
  });
  const delM = useMutation({
    mutationFn: () => deleteFn({ data: { id: helper.id } }),
    onSuccess: () => { onDeleted(); toast.success("Đã xoá"); },
    onError: (e) => toast.error("Không xoá được", { description: (e as Error).message }),
  });

  function togglePerm(id: string) {
    const next = helper.permissions.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p);
    togglePermM.mutate(next);
  }

  const tasks = dataQ.data?.tasks ?? [];
  const payments = dataQ.data?.payments ?? [];
  const activity = dataQ.data?.activity ?? [];
  const att = dataQ.data?.attendance ?? [];
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const denyOff = helper.permissions.filter((p) => p.kind === "deny" && !p.enabled);

  // build 7-day attendance view
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const row = att.find((a) => a.att_date === iso);
    return { date: `T${d.getDate()}/${d.getMonth() + 1}`, iso, status: row?.status ?? "absent" as const };
  });

  return (
    <>
      <section className="px-4 mt-2">
        <RoundedCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-tint-orange grid place-items-center text-3xl shrink-0">{helper.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold leading-tight">{helper.name}</p>
                {helper.verified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success bg-tint-green px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> Đã xác minh
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{helper.role}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-warning fill-warning" />{helper.rating}</span>
                {helper.id_number && <span>{helper.id_number}</span>}
                {helper.hometown && <span>· {helper.hometown}</span>}
              </div>
            </div>
            {helper.phone && (
              <a href={`tel:${helper.phone.replace(/\s/g, "")}`} className="h-10 w-10 rounded-xl bg-brand text-white grid place-items-center shrink-0" aria-label="Gọi">
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground">Bắt đầu</p>
              <p className="text-xs font-bold">{helper.start_date ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground">Lương/tháng</p>
              <p className="text-xs font-bold">{fmtVND(Number(helper.salary))}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground">Trạng thái</p>
              <p className={cn("text-xs font-bold", helper.status === "active" ? "text-success" : "text-muted-foreground")}>
                {helper.status === "active" ? "Đang làm" : helper.status === "paused" ? "Tạm dừng" : "Kết thúc"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowQR((v) => !v)} className="flex items-center gap-2 rounded-2xl bg-tint-blue text-brand p-3 font-semibold text-sm">
              <QrCode className="h-5 w-5" /> {showQR ? "Ẩn QR" : "QR ra vào"}
            </button>
            <button onClick={() => { logFn({ data: { helper_id: helper.id, title: "Cấp quyền nhận hàng", detail: "Áp dụng hôm nay" } }).then(inv); toast.success("Đã cấp quyền nhận hàng cho hôm nay"); }}
              className="flex items-center gap-2 rounded-2xl bg-tint-green text-success p-3 font-semibold text-sm">
              <Package className="h-5 w-5" /> Cho nhận hàng
            </button>
          </div>
          {showQR && (
            <div className="rounded-2xl bg-background border border-border p-4 flex items-center gap-3">
              <div className="h-24 w-24 rounded-xl bg-foreground grid place-items-center shrink-0">
                <QrCode className="h-16 w-16 text-background" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-sm">Mã QR cá nhân</p>
                <p className="text-muted-foreground mt-1">Bảo vệ toà nhà quét để xác minh khi {helper.name} ra/vào.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Hết hạn: 23:59 hôm nay</p>
              </div>
            </div>
          )}
        </RoundedCard>
      </section>

      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="Phân quyền & quyền riêng tư" subtitle="Kiểm soát rõ ràng dữ liệu nào được xem" />
          <button onClick={onAdd} className="text-xs font-semibold text-brand flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Thêm</button>
        </div>
        {denyOff.length > 0 && (
          <RoundedCard className="bg-tint-red border-0 flex items-start gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-emergency shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emergency">Cảnh báo riêng tư</p>
              <p className="text-foreground/80 mt-0.5">Đang tắt {denyOff.length} hạn chế ({denyOff.map((p) => p.label).join(", ")}).</p>
            </div>
          </RoundedCard>
        )}
        <div className="space-y-2.5">
          {helper.permissions.map((p) => {
            const isAllow = p.kind === "allow";
            const on = p.enabled;
            return (
              <button key={p.id} onClick={() => togglePerm(p.id)}
                className={cn("w-full text-left rounded-2xl border p-3.5 flex items-start gap-3 transition",
                  on ? (isAllow ? "bg-tint-blue border-brand/30" : "bg-tint-red border-emergency/30") : "bg-card border-border")}>
                <div className={cn("h-10 w-10 rounded-2xl grid place-items-center shrink-0",
                  on ? (isAllow ? "bg-brand text-white" : "bg-emergency text-white") : "bg-muted text-muted-foreground")}>
                  {isAllow ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{p.label}</p>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                      isAllow ? "bg-tint-green text-success" : "bg-tint-red text-emergency")}>
                      {isAllow ? "Cho phép" : "Hạn chế"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{p.desc}</p>
                </div>
                <div className={cn("shrink-0 mt-1 h-6 w-10 rounded-full p-0.5 transition", on ? "bg-brand" : "bg-muted")}>
                  <div className={cn("h-5 w-5 rounded-full bg-white transition shadow-sm", on && "translate-x-4")} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-6">
        <SectionHeader title="Checklist hôm nay" subtitle={`${doneCount}/${tasks.length} đã xong`} />
        <RoundedCard className="p-0 divide-y divide-border">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4 group">
              <button onClick={() => toggleTaskM.mutate({ id: t.id, done: !t.done })}
                className={cn("h-6 w-6 rounded-md border-2 grid place-items-center shrink-0", t.done ? "bg-brand border-brand" : "border-border")}>
                {t.done && <CheckCircle2 className="h-4 w-4 text-white" />}
              </button>
              <div className="h-9 w-9 rounded-2xl bg-tint-green grid place-items-center text-lg shrink-0">{t.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold truncate", t.done && "line-through text-muted-foreground")}>{t.title}</p>
                {t.time && <p className="text-[11px] text-muted-foreground">{t.time}</p>}
              </div>
              <button onClick={() => delTaskM.mutate(t.id)} className="text-muted-foreground opacity-60"><X className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="p-3 flex gap-2">
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Giao việc mới…"
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm" />
            <button onClick={() => { if (!newTask.trim()) return; addTaskM.mutate(newTask.trim()); setNewTask(""); }}
              className="h-9 w-9 rounded-xl bg-brand text-white grid place-items-center"><Plus className="h-4 w-4" /></button>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-6">
        <SectionHeader title="Lịch làm việc trong tuần" />
        <RoundedCard className="p-0 divide-y divide-border">
          {helper.schedule.map((d) => (
            <div key={d.day} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">{d.day}</p>
              <p className={cn("text-xs font-medium", d.off ? "text-muted-foreground" : "text-foreground")}>{d.hours}</p>
            </div>
          ))}
        </RoundedCard>
      </section>

      <section className="px-4 mt-6">
        <SectionHeader title="Chấm công tuần này" subtitle="Bấm để đổi trạng thái" />
        <RoundedCard>
          <div className="grid grid-cols-7 gap-2">
            {week.map((d) => (
              <button key={d.iso} onClick={() => {
                const idx = ATT_CYCLE.indexOf(d.status as any);
                const next = ATT_CYCLE[(idx + 1) % ATT_CYCLE.length];
                setAttM.mutate({ att_date: d.iso, status: next });
              }} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">{d.date}</span>
                <div className={cn("h-9 w-9 rounded-xl grid place-items-center text-[11px] font-bold", attTone[d.status])}>
                  {d.status === "present" ? "✓" : d.status === "leave" ? "P" : "—"}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
            <span>● Có mặt</span><span>● Nghỉ phép</span><span>● Vắng</span>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-6">
        <SectionHeader title="Nhật ký hoạt động" />
        <RoundedCard className="p-0">
          {activity.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">Chưa có hoạt động</p>
          ) : (
            <ol>
              {activity.map((a, idx) => (
                <li key={a.id} className="flex gap-3 px-4 py-3.5">
                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 rounded-2xl bg-tint-blue text-brand grid place-items-center shrink-0">
                      <Activity className="h-4 w-4" />
                    </div>
                    {idx < activity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground ml-auto">{new Date(a.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                    </div>
                    {a.detail && <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </RoundedCard>
      </section>

      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="Lương" />
          <button onClick={() => addPayM.mutate()} className="text-xs font-semibold text-brand flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Tạo phiếu
          </button>
        </div>
        <RoundedCard className="p-0 divide-y divide-border">
          {payments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">Chưa có phiếu lương</p>
          ) : payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{p.month}</p>
                <p className="text-[11px] text-muted-foreground">{fmtVND(Number(p.amount))}</p>
              </div>
              <button onClick={() => togglePayM.mutate({ id: p.id, status: p.status === "paid" ? "pending" : "paid" })}
                className={cn("text-[10px] px-2.5 py-1 rounded-full font-semibold",
                  p.status === "paid" ? "bg-tint-green text-success" : "bg-tint-orange text-warning")}>
                {p.status === "paid" ? "Đã trả" : "Chờ trả"}
              </button>
            </div>
          ))}
        </RoundedCard>
      </section>

      <section className="px-4 mt-6 mb-8">
        <button onClick={() => { if (confirm(`Xoá hồ sơ ${helper.name}? Tất cả dữ liệu liên quan sẽ mất.`)) delM.mutate(); }}
          className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2">
          <Trash2 className="h-4 w-4" /> Xoá hồ sơ
        </button>
      </section>
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-card border border-border rounded-2xl px-3 py-2.5 text-sm" />
    </label>
  );
}
