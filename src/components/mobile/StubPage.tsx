import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { PageHeader } from "@/components/common/PageHeader";

type StubProps = {
  title: string;
  subtitle: string;
  emoji: string;
  sections: { title: string; items: { icon: string; label: string; desc: string }[] }[];
};

/**
 * StubPage — nội dung khung cho các module Family Core chưa hoàn thiện.
 * Tách MobileShell ra ngoài để route file kiểm soát layout/shell tự do.
 */
export function StubPage({ title, subtitle, emoji, sections }: StubProps) {
  return (
    <>
      <PageHeader eyebrow="Family Core" title={title} subtitle={subtitle} emoji={emoji} />
      {sections.map((s) => (
        <section key={s.title} className="px-4 mt-4">
          <SectionHeader title={s.title} />
          <RoundedCard className="p-0 divide-y divide-border">
            {s.items.map((it) => (
              <button
                key={it.label}
                className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/40 transition"
              >
                <div className="h-10 w-10 rounded-2xl bg-tint-blue grid place-items-center text-lg shrink-0">
                  {it.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{it.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{it.desc}</p>
                </div>
              </button>
            ))}
          </RoundedCard>
        </section>
      ))}
    </>
  );
}
