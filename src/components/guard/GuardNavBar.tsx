import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUARD_LARGE_TITLE } from "./guardLayout";

type GuardNavBarProps = {
  /** Large title on root tabs (iOS scroll style) */
  largeTitle?: string;
  subtitle?: string;
  /** Compact bar with back (pushed screens) */
  title?: string;
  backTo?: string;
  backLabel?: string;
  trailing?: ReactNode;
  showBrand?: boolean;
};

export function GuardNavBar({
  largeTitle,
  subtitle,
  title,
  backTo,
  backLabel = "Quay lại",
  trailing,
  showBrand = true,
}: GuardNavBarProps) {
  const router = useRouter();

  if (title || backTo) {
    return (
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/60">
        <div
          className="flex items-center min-h-[44px] px-2 pt-[env(safe-area-inset-top,0px)]"
          style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
        >
          {backTo ? (
            <button
              type="button"
              onClick={() => router.history.back()}
              className="flex items-center gap-0.5 min-h-[44px] min-w-[44px] px-2 text-brand text-[17px] font-normal active:opacity-60"
            >
              <ChevronLeft className="h-5 w-5 -ml-0.5" strokeWidth={2.2} />
              <span className="max-w-[120px] truncate">{backLabel}</span>
            </button>
          ) : (
            <div className="w-[88px]" />
          )}
          <h1 className="flex-1 text-center text-[17px] font-semibold truncate px-1">
            {title}
          </h1>
          <div className="min-w-[88px] flex justify-end pr-2">{trailing}</div>
        </div>
      </header>
    );
  }

  return (
    <header className="px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2">
      {showBrand && (
        <div className="flex items-center justify-between mb-2">
          <Link to="/guard" className="flex items-center gap-2 min-h-[44px]">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand to-navy grid place-items-center shadow-[var(--shadow-soft)]">
              <Shield className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-bold tracking-tight">
                STOS <span className="text-brand">Guard</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Vận hành ca trực</p>
            </div>
          </Link>
          {trailing}
        </div>
      )}
      {largeTitle && (
        <h1 className={cn(GUARD_LARGE_TITLE, "px-0.5")}>{largeTitle}</h1>
      )}
      {subtitle && (
        <p className="text-[15px] text-muted-foreground mt-1 px-0.5">{subtitle}</p>
      )}
    </header>
  );
}
