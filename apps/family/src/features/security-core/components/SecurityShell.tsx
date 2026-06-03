import type { ReactNode } from "react";
import { BottomNav } from "@shared/ui/mobile/BottomNav";
import { SideNav } from "@shared/ui/mobile/SideNav";
import { SHELL_OUTER, SHELL_CONTAINER } from "@shared/ui/mobile/shellLayout";
import { ShieldCheck, ArrowLeft } from "lucide-react";

/**
 * SecurityShell — vỏ chung cho mọi màn thuộc Security Core.
 * Bọc `dark` cục bộ trong wrapper thay vì đẩy lên <html> để
 * không ghi đè theme user chọn (Dark/Light toggle vẫn nhất quán
 * khi điều hướng vào/ra Security Core).
 */
import { Link } from "@tanstack/react-router";

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
      <div className={SHELL_CONTAINER}>
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
      <BottomNav />
    </div>
  );
}

