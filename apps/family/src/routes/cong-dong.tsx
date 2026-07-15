import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { requireAuth } from "@/api/require-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listCommunityEvents, listCommunityServices, registerCommunityEvent } from "@/api/community";
import { toast } from "sonner";

export const Route = createFileRoute("/cong-dong")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Cộng đồng — STOS Life" }] }),
  component: CommunityPage,
});

function CommunityPage() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const servicesQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });

  const eventsQ = useQuery({
    queryKey: ["community-events"],
    queryFn: () => listCommunityEvents(),
  });

  const regMut = useMutation({
    mutationFn: (eventId: string) =>
      registerCommunityEvent({ event_id: eventId, family_id: familyId ?? undefined }),
    onSuccess: () => {
      toast.success("Đã đăng ký tham gia");
      qc.invalidateQueries({ queryKey: ["community-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader title="Cộng đồng" subtitle="Dịch vụ & sự kiện cho cư dân" back="/home" />

      <section className="px-4 mt-4">
        <SectionHeader title="Dịch vụ gia đình" />
        {servicesQ.isLoading ? (
          <LoadingState />
        ) : (servicesQ.data?.length ?? 0) === 0 ? (
          <EmptyState title="Chưa có dịch vụ" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {servicesQ.data!.map((s: { id: string; name: string; description: string; icon: string; tag: string | null }) => (
              <RoundedCard key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-3xl">{s.icon}</div>
                  {s.tag && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-tint-blue text-brand">
                      {s.tag}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{s.description}</p>
              </RoundedCard>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-7">
        <SectionHeader title="Sự kiện tòa nhà" />
        {eventsQ.isLoading ? (
          <LoadingState />
        ) : (eventsQ.data?.length ?? 0) === 0 ? (
          <EmptyState title="Chưa có sự kiện sắp tới" />
        ) : (
          <div className="space-y-3">
            {eventsQ.data!.map((e: { id: string; title: string; starts_at: string; place: string }) => (
              <RoundedCard key={e.id} className="flex items-center gap-3 p-4">
                <div className="h-12 w-12 rounded-2xl bg-tint-purple grid place-items-center text-xl shrink-0">
                  🎉
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.starts_at).toLocaleString("vi-VN")}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{e.place}</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand shrink-0"
                  disabled={regMut.isPending}
                  onClick={() => regMut.mutate(e.id)}
                >
                  Tham gia
                </button>
              </RoundedCard>
            ))}
          </div>
        )}
      </section>
    </MobileShell>
  );
}
