import type { ReactNode } from "react";
import { SideNav } from "@shared/ui/mobile/SideNav";
import { SHELL_OUTER, SHELL_CONTAINER } from "@shared/ui/mobile/shellLayout";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@shared/utils";

/**
 * SecurityShell — vỏ chung cho mọi màn thuộc Security Core.
 * Không hiển thị bottom nav (màn chi tiết / luồng tập trung).
 */
export function SecurityShell({
  title,
  subtitle,
  children,
  back,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  back?: string;
}) {
  return (
    <div className={SHELL_OUTER}>
      <SideNav />
      <div
        className={cn(
          SHELL_CONTAINER,
          "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] md:pb-12",
        )}
      >
        <header className="px-5 md:px-0 pt-6 pb-2">
          <div className="flex items-start gap-3">
            {back && (
              <Link
                to={back as never}
                className="h-11 w-11 rounded-full bg-muted/40 flex items-center justify-center shrink-0 active:scale-95 transition"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-success text-[10px] font-semibold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5" />
                Security Core · Toà nhà an toàn
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 leading-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
