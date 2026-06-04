import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Lock, Upload, Loader2, FolderOpen } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listMoments, type Moment } from "@/api/moments";

export function MemoriesLive() {
  const { familyId, isLoading: famLoading } = useFamilyContext();

  const q = useQuery({
    queryKey: ["family-moments", familyId],
    queryFn: () => listMoments({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const grouped = useMemo(() => {
    const moments = q.data?.moments ?? [];
    const map = new Map<string, Moment[]>();
    for (const m of moments) {
      const d = new Date(m.taken_at);
      const label = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(m);
    }
    return Array.from(map.entries());
  }, [q.data]);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Kỷ niệm gia đình"
        subtitle="Lưu lại từng khoảnh khắc đáng nhớ"
        emoji="📸"
        back="/gia-dinh"
        right={
          <div className="flex gap-2">
            <Link
              to="/ky-niem-gia-dinh/album"
              className="h-10 w-10 rounded-2xl bg-card border border-border grid place-items-center"
              aria-label="Album"
            >
              <FolderOpen className="h-5 w-5 text-brand" />
            </Link>
            <Link
              to="/ky-niem-gia-dinh/upload"
              className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center shadow-[var(--shadow-soft)]"
              aria-label="Tải ảnh"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      <section className="px-4 mt-2">
        <div className="flex items-center gap-2 rounded-2xl bg-tint-green/60 px-3 py-2 text-[11px]">
          <Lock className="h-3.5 w-3.5 text-green-700" />
          <span>Riêng tư · Chỉ thành viên gia đình mới xem được</span>
        </div>
      </section>

      <section className="px-4 mt-4">
        {famLoading || q.isLoading ? (
          <LoadingState label="Đang tải kỷ niệm…" />
        ) : !familyId ? (
          <EmptyState title="Chưa có hộ gia đình" />
        ) : grouped.length === 0 ? (
          <EmptyState
            title="Chưa có ảnh nào"
            description="Tải ảnh đầu tiên lên album gia đình."
            action={
              <Link
                to="/ky-niem-gia-dinh/upload"
                className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-brand"
              >
                <Upload className="h-4 w-4" /> Tải ảnh
              </Link>
            }
          />
        ) : (
          grouped.map(([month, items]) => (
            <div key={month} className="mb-6">
              <SectionHeader title={month} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {items.map((m) => {
                  const card = (
                    <>
                      {m.media_url ? (
                        <img
                          src={m.media_url}
                          alt={m.caption ?? "Kỷ niệm"}
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full aspect-square bg-muted grid place-items-center text-muted-foreground ${m.media_url ? "hidden" : ""}`}
                      >
                        <span className="text-3xl">📸</span>
                      </div>
                      {m.caption && (
                        <p className="text-[11px] px-2 py-1.5 truncate text-muted-foreground">{m.caption}</p>
                      )}
                    </>
                  );
                  if (!m.media_url) {
                    return (
                      <RoundedCard key={m.id} className="overflow-hidden p-0">
                        {card}
                      </RoundedCard>
                    );
                  }
                  return (
                    <Link key={m.id} to="/ky-niem-gia-dinh/$momentId" params={{ momentId: m.id }}>
                      <RoundedCard className="overflow-hidden p-0">{card}</RoundedCard>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
        {q.isFetching && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>
    </MobileShell>
  );
}
