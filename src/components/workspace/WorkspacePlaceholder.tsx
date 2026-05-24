import { Construction } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  phase?: "MVP" | "Phase 2" | "Phase 3";
  bullets?: string[];
  children?: ReactNode;
};

/**
 * Placeholder cho các route trong workspace BQL / SaaS Admin.
 * Hiển thị tiêu đề, giai đoạn (MVP / Phase 2 / Phase 3) và checklist scope
 * để team biết module đang ở trạng thái nào.
 */
export function WorkspacePlaceholder({ title, subtitle, phase = "MVP", bullets, children }: Props) {
  const phaseClass =
    phase === "MVP"
      ? "bg-tint-green text-success"
      : phase === "Phase 2"
        ? "bg-tint-blue text-brand"
        : "bg-tint-purple text-[oklch(0.65_0.2_295)]";

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${phaseClass}`}>
            {phase}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            App shell
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
      </header>

      <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center shrink-0">
            <Construction className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Module đang ở trạng thái placeholder</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Khung điều hướng & quyền truy cập đã sẵn sàng. Logic nghiệp vụ chi tiết sẽ được build trong sprint tương ứng.
            </p>
            {bullets && bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
