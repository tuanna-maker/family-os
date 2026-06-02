import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Plane, Trash2, Check, X, MapPin, Users, Wallet } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listTrips, getTripWithItems, createTrip, updateTrip, deleteTrip,
  addTripItem, toggleTripItem, deleteTripItem,
  type TripRow, type TripItemKind,
} from "@/lib/family-trips.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/du-lich")({
  head: () => ({
    meta: [
      { title: "Cả nhà du lịch — STOS Life" },
      { name: "description", content: "Lên kế hoạch chuyến đi, checklist, hành lý, ngân sách cho cả gia đình." },
    ],
  }),
  component: TravelPage,
});

function TravelPage() {
  const { familyId, isLoading } = useFamilyContext();
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return (
      <MobileShell>
        <PageHeader eyebrow="Family Core" back="/gia-dinh" title="Cả nhà du lịch" emoji="✈️" />
        <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      </MobileShell>
    );
  }
  if (!familyId) {
    return (
      <MobileShell>
        <PageHeader eyebrow="Family Core" back="/gia-dinh" title="Cả nhà du lịch" emoji="✈️" />
        <section className="px-4 mt-2"><RoundedCard className="text-center py-6 text-sm text-muted-foreground">Bạn cần tham gia một gia đình.</RoundedCard></section>
      </MobileShell>
    );
  }
  return selected
    ? <TripDetail tripId={selected} onBack={() => setSelected(null)} />
    : <TripList familyId={familyId} onOpen={setSelected} />;
}

function fmtMoney(n: number) {
  if (!n) return "0₫";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}tr`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return `${n}₫`;
}
function fmtDateRange(s?: string | null, e?: string | null) {
  if (!s && !e) return "Chưa đặt ngày";
  const f = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
  if (s && e) return `${f(s)} - ${f(e)}`;
  return f((s || e)!);
}

function TripList({ familyId, onOpen }: { familyId: string; onOpen: (id: string) => void }) {
  const listFn = useServerFn(listTrips);
  const createFn = useServerFn(createTrip);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const q = useQuery({ queryKey: ["family-trips", familyId], queryFn: () => listFn({ data: { familyId } }) });
  const createM = useMutation({
    mutationFn: (v: { title: string; destination: string; start_date: string; end_date: string; members_count: number; budget_planned: number }) =>
      createFn({ data: { familyId, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-trips", familyId] });
      setAdding(false);
      toast.success("Đã tạo chuyến đi");
    },
    onError: (e) => toast.error("Không tạo được", { description: (e as Error).message }),
  });

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" back="/gia-dinh" title="Cả nhà du lịch" subtitle="Lên kế hoạch chuyến đi đáng nhớ" emoji="✈️" />
      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="Chuyến đi" subtitle={`${q.data?.length ?? 0} chuyến`} />
          <button onClick={() => setAdding(true)} className="h-9 px-3 rounded-2xl bg-brand text-white text-xs font-bold flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Mới
          </button>
        </div>

        {adding && <NewTripForm onCancel={() => setAdding(false)} onSubmit={(v) => createM.mutate(v)} saving={createM.isPending} />}

        {q.isLoading ? (
          <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
        ) : (q.data?.length ?? 0) === 0 && !adding ? (
          <RoundedCard className="text-center py-8 text-sm text-muted-foreground">
            <Plane className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Chưa có chuyến nào. Bấm "Mới" để tạo.
          </RoundedCard>
        ) : (
          <div className="space-y-3">
            {q.data?.map((t) => <TripCard key={t.id} trip={t} onOpen={() => onOpen(t.id)} />)}
          </div>
        )}
      </section>
    </MobileShell>
  );
}

const STATUS_LABEL: Record<TripRow["status"], { label: string; cls: string }> = {
  planning: { label: "Đang lên KH", cls: "bg-tint-blue text-brand" },
  upcoming: { label: "Sắp đi", cls: "bg-tint-orange text-warning" },
  ongoing: { label: "Đang đi", cls: "bg-tint-green text-success" },
  done: { label: "Đã đi", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
};

function TripCard({ trip, onOpen }: { trip: TripRow; onOpen: () => void }) {
  const s = STATUS_LABEL[trip.status];
  return (
    <button onClick={onOpen} className="w-full text-left">
      <RoundedCard className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base leading-tight truncate">{trip.title}</p>
            {trip.destination && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{trip.destination}</p>}
          </div>
          <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full shrink-0", s.cls)}>{s.label}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>📅 {fmtDateRange(trip.start_date, trip.end_date)}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{trip.members_count}</span>
          <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{fmtMoney(Number(trip.budget_planned))}</span>
        </div>
      </RoundedCard>
    </button>
  );
}

function NewTripForm({ onCancel, onSubmit, saving }: {
  onCancel: () => void;
  onSubmit: (v: { title: string; destination: string; start_date: string; end_date: string; members_count: number; budget_planned: number }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [members, setMembers] = useState(4);
  const [budget, setBudget] = useState(0);
  return (
    <RoundedCard className="space-y-3 mb-3">
      <Field label="Tên chuyến đi *" value={title} onChange={setTitle} placeholder="VD: Đà Nẵng 5N4Đ" />
      <Field label="Điểm đến" value={destination} onChange={setDestination} placeholder="VD: Đà Nẵng" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Bắt đầu" value={start} onChange={setStart} type="date" />
        <Field label="Kết thúc" value={end} onChange={setEnd} type="date" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Số người" value={String(members)} onChange={(v) => setMembers(Number(v) || 1)} type="number" />
        <Field label="Ngân sách (₫)" value={String(budget)} onChange={(v) => setBudget(Number(v) || 0)} type="number" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-semibold">Huỷ</button>
        <button
          disabled={!title.trim() || saving}
          onClick={() => onSubmit({ title: title.trim(), destination, start_date: start, end_date: end, members_count: members, budget_planned: budget })}
          className="flex-1 py-2.5 rounded-2xl bg-brand text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Tạo
        </button>
      </div>
    </RoundedCard>
  );
}

function TripDetail({ tripId, onBack }: { tripId: string; onBack: () => void }) {
  const getFn = useServerFn(getTripWithItems);
  const addFn = useServerFn(addTripItem);
  const toggleFn = useServerFn(toggleTripItem);
  const delItemFn = useServerFn(deleteTripItem);
  const delTripFn = useServerFn(deleteTrip);
  const updateTripFn = useServerFn(updateTrip);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["family-trip", tripId], queryFn: () => getFn({ data: { tripId } }) });
  const inv = () => qc.invalidateQueries({ queryKey: ["family-trip", tripId] });

  const addM = useMutation({
    mutationFn: (v: { kind: TripItemKind; label: string; amount?: number }) => addFn({ data: { trip_id: tripId, ...v } }),
    onSuccess: inv,
  });
  const toggleM = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleFn({ data: v }),
    onSuccess: inv,
  });
  const delItemM = useMutation({
    mutationFn: (id: string) => delItemFn({ data: { id } }),
    onSuccess: inv,
  });
  const delTripM = useMutation({
    mutationFn: () => delTripFn({ data: { id: tripId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["family-trips"] }); onBack(); toast.success("Đã xoá chuyến đi"); },
    onError: (e) => toast.error("Không xoá được", { description: (e as Error).message }),
  });
  const statusM = useMutation({
    mutationFn: (status: TripRow["status"]) => updateTripFn({ data: { id: tripId, status } }),
    onSuccess: inv,
  });

  if (q.isLoading || !q.data?.trip) {
    return (
      <MobileShell>
        <PageHeader eyebrow="Du lịch" back="/du-lich" title="Đang tải…" />
        <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      </MobileShell>
    );
  }

  const { trip, items } = q.data;
  const checklist = items.filter((i) => i.kind === "checklist");
  const packing = items.filter((i) => i.kind === "packing");
  const budget = items.filter((i) => i.kind === "budget");
  const spent = budget.reduce((s, i) => s + Number(i.amount ?? 0), 0);

  return (
    <MobileShell>
      <div onClick={onBack}>
        <PageHeader eyebrow="Du lịch" back="/du-lich" title={trip.title} subtitle={trip.destination ?? undefined} emoji="✈️" />
      </div>

      <section className="px-4 mt-5 space-y-3">
        <RoundedCard className="space-y-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>📅 {fmtDateRange(trip.start_date, trip.end_date)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{trip.members_count} người</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ngân sách</span>
            <span className="font-bold">{fmtMoney(spent)} / {fmtMoney(Number(trip.budget_planned))}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_LABEL) as TripRow["status"][]).map((s) => (
              <button key={s} onClick={() => statusM.mutate(s)}
                className={cn("text-[10px] px-2 py-1 rounded-full font-semibold",
                  trip.status === s ? STATUS_LABEL[s].cls : "bg-muted text-muted-foreground")}>
                {STATUS_LABEL[s].label}
              </button>
            ))}
          </div>
        </RoundedCard>

        <ItemSection
          title="Checklist" emoji="✅" kind="checklist" items={checklist}
          onAdd={(label) => addM.mutate({ kind: "checklist", label })}
          onToggle={(id, done) => toggleM.mutate({ id, done })}
          onDelete={(id) => delItemM.mutate(id)}
        />
        <ItemSection
          title="Hành lý" emoji="🧳" kind="packing" items={packing}
          onAdd={(label) => addM.mutate({ kind: "packing", label })}
          onToggle={(id, done) => toggleM.mutate({ id, done })}
          onDelete={(id) => delItemM.mutate(id)}
        />
        <ItemSection
          title="Ngân sách" emoji="💰" kind="budget" items={budget} showAmount
          onAdd={(label, amount) => addM.mutate({ kind: "budget", label, amount })}
          onToggle={(id, done) => toggleM.mutate({ id, done })}
          onDelete={(id) => delItemM.mutate(id)}
        />

        <button onClick={() => { if (confirm("Xoá chuyến đi này?")) delTripM.mutate(); }}
          className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 mb-8">
          <Trash2 className="h-4 w-4" /> Xoá chuyến đi
        </button>
      </section>
    </MobileShell>
  );
}

function ItemSection({
  title, emoji, items, onAdd, onToggle, onDelete, showAmount,
}: {
  title: string; emoji: string; kind: TripItemKind;
  items: { id: string; label: string; done: boolean; amount: number | null }[];
  onAdd: (label: string, amount?: number) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  showAmount?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <RoundedCard className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm">{emoji} {title}</p>
        <span className="text-[11px] text-muted-foreground">{items.filter(i => i.done).length}/{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-2 group">
            <button onClick={() => onToggle(i.id, !i.done)}
              className={cn("h-5 w-5 rounded border shrink-0 grid place-items-center",
                i.done ? "bg-brand border-brand" : "border-border")}>
              {i.done && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className={cn("flex-1 text-sm", i.done && "line-through text-muted-foreground")}>{i.label}</span>
            {showAmount && i.amount != null && <span className="text-xs font-semibold">{fmtMoney(Number(i.amount))}</span>}
            <button onClick={() => onDelete(i.id)} className="text-muted-foreground opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 pt-1">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Thêm mục…"
          className="flex-1 bg-muted/40 border border-border rounded-xl px-2.5 py-1.5 text-xs" />
        {showAmount && (
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Số tiền" type="number"
            className="w-20 bg-muted/40 border border-border rounded-xl px-2 py-1.5 text-xs" />
        )}
        <button onClick={() => { if (!label.trim()) return; onAdd(label.trim(), showAmount ? Number(amount) || 0 : undefined); setLabel(""); setAmount(""); }}
          className="h-8 w-8 rounded-xl bg-brand text-white grid place-items-center"><Plus className="h-4 w-4" /></button>
      </div>
    </RoundedCard>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full bg-card border border-border rounded-2xl px-3 py-2.5 text-sm" />
    </label>
  );
}
