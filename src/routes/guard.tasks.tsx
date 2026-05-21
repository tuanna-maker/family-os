import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GuardMobileShell } from "@/components/guard/GuardMobileShell";
import { guardTasks } from "@/features/guard-mobile/data";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";
import { ChevronRight, Siren } from "lucide-react";

export const Route = createFileRoute("/guard/tasks")({
  head: () => ({ meta: [{ title: "Nhiệm vụ — STOS Guard" }] }),
  component: GuardTasksPage,
});

const FILTERS = ["Tất cả", "SOS", "Khách", "Tuần tra"] as const;

function GuardTasksPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tất cả");

  const filtered = guardTasks.filter((t) => {
    if (filter === "Tất cả") return true;
    if (filter === "SOS") return t.type === "SOS";
    if (filter === "Khách") return t.type === "Khách";
    return t.type === "Tuần tra";
  });

  return (
    <GuardMobileShell largeTitle="Nhiệm vụ" subtitle="Sự cố · SOS · khách chờ duyệt">
      <section className="px-4 mt-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                hapticLight();
                setFilter(f);
              }}
              className={cn(
                "shrink-0 min-h-[32px] px-4 rounded-full text-[13px] font-semibold border transition-colors",
                filter === f
                  ? "bg-brand text-primary-foreground border-brand"
                  : "bg-card border-border text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <ul className="px-4 mt-4 space-y-3">
        {filtered.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => hapticLight()}
              className="w-full text-left rounded-[14px] bg-card border border-border p-4 min-h-[72px] active:scale-[0.99] transition flex items-start gap-3"
            >
              <span
                className={cn(
                  "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                  t.priority === "P1" ? "bg-emergency/15 text-emergency" : "bg-tint-blue text-brand",
                )}
              >
                {t.type === "SOS" ? (
                  <Siren className="h-5 w-5" />
                ) : (
                  <span className="text-[11px] font-bold">{t.priority}</span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold leading-snug">{t.title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t.location} · {t.ago}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="px-4 py-12 text-center text-[14px] text-muted-foreground">
          Không có nhiệm vụ trong nhóm này.
        </p>
      )}
    </GuardMobileShell>
  );
}
