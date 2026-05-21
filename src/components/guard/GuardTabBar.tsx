import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";
import { GUARD_TABS, isGuardTabActive } from "@/constants/guard-mobile-nav";

const DEBOUNCE_MS = 320;

function isModuleLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(
    message,
  );
}

/**
 * Native-style tab bar — blur material, safe-area, 44pt targets.
 * Center tab elevated for QR (common iOS/Android field pattern).
 */
export function GuardTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading || s.isTransitioning,
  });
  const navigate = useNavigate();
  const lastTapRef = useRef<{ to: string; at: number } | null>(null);

  const handleTap = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const now = Date.now();
    const last = lastTapRef.current;
    const tab = GUARD_TABS.find((t) => t.to === to);
    const active = tab ? isGuardTabActive(tab, pathname) : pathname === to;
    if (active) return;
    if (last && last.to === to && now - last.at < DEBOUNCE_MS) return;
    if (isLoading && last && now - last.at < DEBOUNCE_MS) return;
    lastTapRef.current = { to, at: now };
    hapticLight();
    void navigate({ to }).catch((error) => {
      if (isModuleLoadError(error)) window.location.assign(to);
      else throw error;
    });
  };

  return (
    <nav
      className="guard-tab-bar fixed bottom-0 inset-x-0 z-50 mx-auto max-w-md md:max-w-lg lg:max-w-xl"
      aria-label="Điều hướng chính STOS Guard"
    >
      <div className="guard-tab-bar-inner border-t border-border/80 bg-card/85 backdrop-blur-xl">
        <ul className="grid grid-cols-5 items-end px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {GUARD_TABS.map((tab) => {
            const active = isGuardTabActive(tab, pathname);
            const Icon = tab.icon;

            if (tab.prominent) {
              return (
                <li key={tab.id} className="flex flex-col items-center -mt-5">
                  <Link
                    to={tab.to}
                    onClick={handleTap(tab.to)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-0.5 min-h-[44px] min-w-[44px] justify-end",
                      "active:scale-[0.94] transition-transform duration-150",
                    )}
                  >
                    <span
                      className={cn(
                        "h-[52px] w-[52px] rounded-2xl grid place-items-center shadow-[var(--shadow-pop)]",
                        "bg-brand text-primary-foreground ring-4 ring-background",
                        active && "scale-105",
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold mt-1",
                        active ? "text-brand" : "text-muted-foreground",
                      )}
                    >
                      {tab.label}
                    </span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={tab.id}>
                <Link
                  to={tab.to}
                  onClick={handleTap(tab.to)}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={isLoading || undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5",
                    "min-h-[44px] min-w-[44px] py-1",
                    "text-[10px] font-medium transition-colors duration-200",
                    "active:opacity-70",
                    active ? "text-brand" : "text-muted-foreground",
                    isLoading && !active && "opacity-60",
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
