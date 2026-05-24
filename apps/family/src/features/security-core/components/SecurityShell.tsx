import type { ReactNode } from "react";
import { BottomNav } from "@shared/ui/mobile/BottomNav";
import { SideNav } from "@shared/ui/mobile/SideNav";
import { SHELL_OUTER, SHELL_CONTAINER } from "@shared/ui/mobile/shellLayout";
import { ShieldCheck } from "lucide-react";

/**
 * SecurityShell — vỏ chung cho mọi màn thuộc Security Core.
 * Bọc `dark` cục bộ trong wrapper thay vì đẩy lên <html> để
 * không ghi đè theme user chọn (Dark/Light toggle vẫn nhất quán
 * khi điều hướng vào/ra Security Core).
 */
export function SecurityShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className={SHELL_OUTER}>
      <SideNav />
      <div className={SHELL_CONTAINER}>
        <header className="px-5 md:px-0 pt-6 pb-2">
          <div className="flex items-center gap-2 text-success text-[10px] font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            Security Core · Toà nhà an toàn
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </header>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

