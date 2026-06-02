import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyContext } from "@/hooks/use-family-context";

export const Route = createFileRoute("/cong-dong")({
  head: () => ({ meta: [{ title: "Cộng đồng — STOS Life" }] }),
  component: CommunityPage,
});

type Svc = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string | null;
};
type Evt = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  place: string;
};

function CommunityPage() {
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const servicesQ = useQuery({
    queryKey: ["community-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_services")
        .select("id,name,description,icon,tag")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Svc[];
    },
  });

  const eventsQ = useQuery({
    queryKey: ["community-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("id,title,description,starts_at,place")
        .eq("active", true)
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as Evt[];
    },
  });

  const myRegsQ = useQuery({
    queryKey: ["my-event-regs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.event_id as string));
    },
  });

  const joinMut = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Cần đăng nhập");
      const { error } = await supabase
        .from("event_registrations")
        .insert({ event_id: eventId, user_id: user.id, family_id: familyId ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã ghi nhận đăng ký");
      qc.invalidateQueries({ queryKey: ["my-event-regs"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "Bạn đã đăng ký rồi" : "Đăng ký thất bại", {
        description: e.message,
      }),
  });

  const leaveMut = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Cần đăng nhập");
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã huỷ đăng ký");
      qc.invalidateQueries({ queryKey: ["my-event-regs"] });
    },
    onError: (e: Error) => toast.error("Huỷ thất bại", { description: e.message }),
  });

  const query = q.trim().toLowerCase();
  const services = servicesQ.data ?? [];
  const events = eventsQ.data ?? [];
  const filteredServices = useMemo(
    () =>
      query
        ? services.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.description.toLowerCase().includes(query) ||
              (s.tag ?? "").toLowerCase().includes(query),
          )
        : services,
    [query, services],
  );
  const filteredEvents = useMemo(
    () =>
      query
        ? events.filter(
            (e) =>
              e.title.toLowerCase().includes(query) || e.place.toLowerCase().includes(query),
          )
        : events,
    [query, events],
  );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <MobileShell>
      <PageHeader title="Cộng đồng" subtitle="Dịch vụ & sự kiện cho cư dân" back={false} />

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm dịch vụ, sự kiện..."
            aria-label="Tìm kiếm cộng đồng"
            className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-4 text-sm outline-none focus:ring-2 ring-brand/30"
          />
        </div>
      </div>

      <section className="px-4 mt-6">
        <SectionHeader title="Dịch vụ gia đình" />
        {servicesQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <RoundedCard className="p-5 text-center text-xs text-muted-foreground">
            Không tìm thấy dịch vụ phù hợp.
          </RoundedCard>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredServices.map((s) => (
              <a
                key={s.id}
                href={`/dich-vu?service=${s.id}`}
                className="text-left active:opacity-80"
              >
                <RoundedCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{s.icon}</div>
                    {s.tag && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-tint-blue text-brand">
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
                </RoundedCard>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-7 pb-4">
        <SectionHeader title="Sự kiện toà nhà" />
        {eventsQ.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <RoundedCard className="p-5 text-center text-xs text-muted-foreground">
            Chưa có sự kiện phù hợp.
          </RoundedCard>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((e) => {
              const joined = myRegsQ.data?.has(e.id);
              return (
                <RoundedCard key={e.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-tint-purple grid place-items-center text-xl shrink-0">
                    🎉
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{fmt(e.starts_at)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{e.place}</p>
                  </div>
                  {joined ? (
                    <button
                      onClick={() => leaveMut.mutate(e.id)}
                      disabled={leaveMut.isPending}
                      className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1 disabled:opacity-50"
                      aria-label="Huỷ đăng ký"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Đã đăng ký · Huỷ
                    </button>
                  ) : (
                    <button
                      disabled={joinMut.isPending}
                      onClick={() => joinMut.mutate(e.id)}
                      className="text-xs font-semibold text-brand shrink-0 disabled:opacity-50"
                    >
                      {joinMut.isPending ? "..." : "Tham gia"}
                    </button>
                  )}
                </RoundedCard>
              );
            })}
          </div>
        )}
      </section>
    </MobileShell>
  );
}
