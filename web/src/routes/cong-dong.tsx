import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { Search } from "lucide-react";
import { communityServices, communityEvents } from "@/features/community";

export const Route = createFileRoute("/cong-dong")({
  head: () => ({ meta: [{ title: "Cộng đồng — STOS Life" }] }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <MobileShell>
      <PageHeader title="Cộng đồng" subtitle="Dịch vụ & sự kiện cho cư dân" back={false} />

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Tìm dịch vụ, cửa hàng..."
            className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-4 text-sm outline-none focus:ring-2 ring-brand/30"
          />
        </div>
      </div>

      <section className="px-4 mt-6">
        <SectionHeader title="Dịch vụ gia đình" />
        <div className="grid grid-cols-2 gap-3">
          {communityServices.map((s) => (
            <RoundedCard key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-3xl">{s.icon}</div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-tint-blue text-brand">
                  {s.tag}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">{s.desc}</p>
            </RoundedCard>
          ))}
        </div>
      </section>

      <section className="px-4 mt-7">
        <SectionHeader title="Sự kiện tòa nhà" />
        <div className="space-y-3">
          {communityEvents.map((e) => (
            <RoundedCard key={e.id} className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-tint-purple grid place-items-center text-xl shrink-0">🎉</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.time}</p>
                <p className="text-[11px] text-muted-foreground truncate">{e.place}</p>
              </div>
              <button className="text-xs font-semibold text-brand shrink-0">Tham gia</button>
            </RoundedCard>
          ))}
        </div>
      </section>
    </MobileShell>
  );
}
