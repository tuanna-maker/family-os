import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Users, ShieldCheck, Sparkles, User } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { cn } from "@shared/utils";

const tabs = [
  { to: "/home", label: "Trang chủ", icon: Home },
  { to: "/gia-dinh", label: "Gia đình", icon: Users },
  { to: "/bao-an", label: "Bảo an", icon: ShieldCheck },
  { to: "/cong-dong", label: "Cộng đồng", icon: Sparkles },
  { to: "/tai-khoan", label: "Tài khoản", icon: User },
] as const;

const DEBOUNCE_MS = 350;

function isModuleLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(
    message,
  );
}

export function BottomNav() {
  // Chỉ subscribe pathname — KHÔNG subscribe router loading state để tránh
  // BottomNav re-render đúng lúc TanStack Router đang commit route mới
  // (đã từng gây crash reconciler "undefined is not an object (evaluating 'p[t]')"
  // và làm hiện trang lỗi 1-2s trước khi route load xong).
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const lastTapRef = useRef<{ to: string; at: number } | null>(null);

  const handleTap = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const now = Date.now();
    const last = lastTapRef.current;
    if (pathname === to) return;
    if (last && last.to === to && now - last.at < DEBOUNCE_MS) return;
    lastTapRef.current = { to, at: now };
    void navigate({ to }).catch((error) => {
      if (isModuleLoadError(error)) window.location.assign(to);
      else throw error;
    });
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md">
      <div className="mx-3 mb-3 rounded-3xl border border-border bg-card/90 backdrop-blur-xl shadow-[var(--shadow-pop)]">
        <ul className="grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            const isFeatured = to === "/bao-an";
            return (
              <li key={to} className={cn(isFeatured && "relative")}>
                <Link
                  to={to}
                  onClick={handleTap(to)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                    "transition-colors duration-200 ease-out",
                    "active:scale-[0.96] transition-transform",
                    isFeatured
                      ? "text-emergency"
                      : active
                        ? "text-brand"
                        : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isFeatured ? (
                    <div
                      className={cn(
                        "h-12 w-12 -mt-6 grid place-items-center rounded-full",
                        "bg-gradient-to-br from-emergency to-pink text-white",
                        "shadow-[0_8px_20px_-4px_hsl(var(--emergency)/0.55)] ring-4 ring-card",
                        "transition-transform duration-300 ease-out",
                        active && "scale-110",
                      )}
                    >
                      <Icon className="h-[22px] w-[22px]" strokeWidth={2.4} />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "h-9 w-9 grid place-items-center rounded-2xl",
                        "transition-all duration-300 ease-out",
                        active && "bg-tint-blue scale-105",
                      )}
                    >
                      <Icon
                        className="h-[18px] w-[18px] transition-transform duration-200"
                        strokeWidth={active ? 2.4 : 2}
                      />
                    </div>
                  )}
                  <span className={cn(isFeatured && "font-semibold")}>{label}</span>
                </Link>
              </li>
            );
          })}

        </ul>
      </div>
    </nav>
  );
}
