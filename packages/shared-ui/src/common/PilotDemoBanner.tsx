import { Sparkles } from "lucide-react";

/** Banner pilot/demo — không lộ email thô, phù hợp gửi đối tác. */
export function PilotDemoBanner({
  roleLabel,
  appName,
}: {
  roleLabel: string;
  appName: "STOS Life" | "STOS Guard";
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand/[0.06] to-pink/[0.04] px-4 py-3.5 flex items-start gap-3"
    >
      <span className="shrink-0 mt-0.5 h-9 w-9 rounded-xl bg-brand/10 grid place-items-center text-brand">
        <Sparkles className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
            Bản demo
          </span>
          <span className="text-[11px] text-muted-foreground">{appName}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-foreground">
          Tài khoản {roleLabel} đã sẵn sàng
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          Nhấn <span className="font-semibold text-foreground">Đăng nhập</span> để trải nghiệm — không cần nhập lại.
        </p>
      </div>
    </div>
  );
}
