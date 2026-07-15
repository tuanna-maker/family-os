import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { requireAuth } from "@/api/require-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  deleteTrip,
  deleteTripItem,
  getTripBundle,
  listTrips,
  toggleTripItem,
} from "@/api/trips";
import { formatVND } from "@shared/utils/formatters";
export const Route = createFileRoute("/du-lich")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Du lịch gia đình — STOS Life" }] }),
  component: TravelPage,
});

const STATUS_LABEL: Record<string, string> = {
  planning: "Đang lên kế hoạch",
  upcoming: "Sắp đi",
  ongoing: "Đang đi",
  done: "Đã xong",
  cancelled: "Đã hủy",
};

function TravelPage() {
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tripsQ = useQuery({
    queryKey: ["family-trips", familyId],
    queryFn: () => listTrips({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const trips = tripsQ.data ?? [];
  const activeId = selectedId ?? trips[0]?.id ?? null;

  const bundleQ = useQuery({
    queryKey: ["trip-bundle", activeId],
    queryFn: () => getTripBundle({ trip_id: activeId! }),
    enabled: !!activeId,
  });

  const selected = useMemo(() => trips.find((t) => t.id === activeId), [trips, activeId]);
  const items = bundleQ.data?.items ?? [];
  const checklist = items.filter((i) => i.kind === "checklist");
  const packing = items.filter((i) => i.kind === "packing");
  const budget = items.filter((i) => i.kind === "budget");
  const doneCheck = checklist.filter((i) => i.done).length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["family-trips"] });
    qc.invalidateQueries({ queryKey: ["trip-bundle"] });
  };

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleTripItem(v),
    onSuccess: invalidate,
  });

  const delTripMut = useMutation({
    mutationFn: (id: string) => deleteTrip({ id }),
    onSuccess: () => {
      toast.success("Đã xóa chuyến đi");
      setSelectedId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteTripItem({ id }),
    onSuccess: () => {
      toast.success("Đã xóa mục");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Cả nhà du lịch"
        subtitle="Kế hoạch, checklist và ngân sách chuyến đi"
        emoji="✈️"
        back="/gia-dinh"
        right={
          <button
            type="button"
            onClick={() => navigate({ to: "/du-lich/them" })}
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center"
            aria-label="Thêm chuyến đi"
          >            <Plus className="h-5 w-5" />
          </button>
        }
      />

      {famLoading || tripsQ.isLoading ? (
        <div className="px-4 mt-4">
          <LoadingState />
        </div>
      ) : !familyId ? (
        <EmptyState title="Chưa có hộ gia đình" />
      ) : trips.length === 0 ? (
        <section className="px-4 mt-4">
          <EmptyState
            title="Chưa có chuyến đi"
            description="Lên kế hoạch kỳ nghỉ đầu tiên cho cả nhà."
            action={
              <Button className="mt-3" onClick={() => navigate({ to: "/du-lich/them" })}>
                Tạo chuyến đi
              </Button>            }
          />
        </section>
      ) : (
        <>
          <section className="px-4 mt-4 flex gap-2 overflow-x-auto pb-1">
            {trips.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold border max-w-[160px] truncate ${
                  activeId === t.id ? "bg-brand text-white border-brand" : "bg-card border-border"
                }`}
              >
                {t.title}
              </button>
            ))}
          </section>

          {selected && (
            <section className="px-4 mt-4 space-y-4">
              <RoundedCard className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-lg">{selected.title}</p>
                    {selected.destination && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" /> {selected.destination}
                      </p>
                    )}
                    {(selected.start_date || selected.end_date) && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {selected.start_date ?? "—"} → {selected.end_date ?? "—"}
                      </p>
                    )}
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-tint-blue text-brand">
                      {STATUS_LABEL[selected.status] ?? selected.status}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2 rounded-xl border"
                      onClick={() => navigate({ to: "/du-lich/sua/$tripId", params: { tripId: selected.id } })}
                    >                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-xl border text-emergency"
                      onClick={() => delTripMut.mutate(selected.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {selected.members_count} người · Ngân sách {formatVND(Number(selected.budget_planned))}
                </p>
                {checklist.length > 0 && (
                  <p className="text-xs mt-2 text-success font-medium">
                    Checklist: {doneCheck}/{checklist.length} hoàn thành
                  </p>
                )}
              </RoundedCard>

              <ItemSection
                title="Checklist"
                items={checklist}
                onToggle={(id, done) => toggleMut.mutate({ id, done })}
                onDelete={(id) => delItemMut.mutate(id)}
                onAdd={() =>
                  navigate({
                    to: "/du-lich/$tripId/them-muc",
                    params: { tripId: activeId! },
                    search: { kind: "checklist" },
                  })
                }
              />
              <ItemSection
                title="Đồ cần mang"
                items={packing}
                onToggle={(id, done) => toggleMut.mutate({ id, done })}
                onDelete={(id) => delItemMut.mutate(id)}
                onAdd={() =>
                  navigate({
                    to: "/du-lich/$tripId/them-muc",
                    params: { tripId: activeId! },
                    search: { kind: "packing" },
                  })
                }
              />
              <ItemSection
                title="Ngân sách chi tiết"
                items={budget}
                onToggle={(id, done) => toggleMut.mutate({ id, done })}
                onDelete={(id) => delItemMut.mutate(id)}
                onAdd={() =>
                  navigate({
                    to: "/du-lich/$tripId/them-muc",
                    params: { tripId: activeId! },
                    search: { kind: "budget" },
                  })
                }                showAmount
              />
            </section>
          )}
        </>
      )}

    </MobileShell>
  );
}
function ItemSection({
  title,
  items,
  onToggle,
  onDelete,
  onAdd,
  showAmount,
}: {
  title: string;
  items: { id: string; label: string; done: boolean; amount: number | null }[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  showAmount?: boolean;
}) {
  return (
    <div>
      <SectionHeader
        title={title}
        action={
          <button type="button" onClick={onAdd} className="text-xs font-semibold text-brand">
            + Thêm
          </button>
        }
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-2">Chưa có mục nào.</p>
      ) : (
        <RoundedCard className="p-0 divide-y divide-border mt-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={it.done}
                onChange={(e) => onToggle(it.id, e.target.checked)}
                className="h-4 w-4"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${it.done ? "line-through text-muted-foreground" : ""}`}>{it.label}</p>
                {showAmount && it.amount != null && (
                  <p className="text-[11px] text-muted-foreground">{formatVND(Number(it.amount))}</p>
                )}
              </div>
              <button type="button" onClick={() => onDelete(it.id)} className="text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </RoundedCard>
      )}
    </div>
  );
}