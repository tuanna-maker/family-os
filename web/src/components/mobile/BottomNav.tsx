import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Users, ShieldCheck, Sparkles, User, type LucideIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Trang chủ", icon: Home },
  { to: "/gia-dinh", label: "Gia đình", icon: Users },
  { to: "/bao-an", label: "Bảo an", icon: ShieldCheck },
  { to: "/cong-dong", label: "Cộng đồng", icon: Sparkles },
  { to: "/tai-khoan", label: "Tài khoản", icon: User },
] as const;

type TabTo = (typeof tabs)[number]["to"];

const DEBOUNCE_MS = 350;

function isModuleLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(
    message,
  );
}

/**
 * Selector trả về `to` của tab đang active (hoặc null) thay vì raw pathname.
 * Nhờ vậy khi điều hướng giữa hai route ngoài tab (vd: /chi-tieu → /con-cai)
 * giá trị select không đổi → BottomNav không re-render.
 */
function selectActiveTo(pathname: string): TabTo | null {
  for (const t of tabs) if (pathname === t.to) return t.to;
  return null;
}

/**
 * Phát một chuỗi 2 nốt "chirp" ngắn bằng Web Audio API để báo khẩn cấp.
 * Không cần asset, hoạt động trên iOS/Android sau cử chỉ người dùng (tap).
 */
let _audioCtx: AudioContext | null = null;
function playEmergencyChirp() {
  if (typeof window === "undefined") return;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!_audioCtx) _audioCtx = new AC();
  const ctx = _audioCtx;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  const tones: Array<{ freq: number; start: number; dur: number }> = [
    { freq: 880, start: 0, dur: 0.14 },
    { freq: 1175, start: 0.16, dur: 0.18 },
  ];
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  for (const t of tones) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = t.freq;
    g.gain.setValueAtTime(0.0001, now + t.start);
    g.gain.exponentialRampToValueAtTime(1, now + t.start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
    osc.connect(g).connect(master);
    osc.start(now + t.start);
    osc.stop(now + t.start + t.dur + 0.02);
  }
}

interface TabItemProps {
  to: TabTo;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  featured: boolean;
  onTap: (to: TabTo, e: MouseEvent<HTMLAnchorElement>) => void;
}

const TabItem = memo(function TabItem({ to, label, Icon, active, featured, onTap }: TabItemProps) {
  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => onTap(to, e), [onTap, to]);
  return (
    <li className={cn(featured && "relative")}>
      <Link
        to={to}
        onClick={handleClick}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
          "min-h-[60px]",
          "transition-colors duration-200 ease-out",
          "active:scale-[0.96] transition-transform",
          featured
            ? "text-emergency"
            : active
              ? "text-brand"
              : "text-muted-foreground hover:text-foreground",
        )}
      >
        {featured ? (
          <>
            {/* Vùng chạm mở rộng vô hình (~88x88) cho người lớn tuổi dễ bấm */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 -top-10 h-[88px] w-[88px] rounded-full"
            />
            {/* Quầng glow tĩnh dùng radial-gradient — rẻ hơn blur filter, không repaint khi cuộn */}
            <span
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(closest-side, hsl(var(--emergency) / 0.45), hsl(var(--emergency) / 0.12) 60%, transparent 72%)",
              }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 h-20 w-20 rounded-full transform-gpu dark:opacity-90"
            />
            <div
              className={cn(
                "relative h-14 w-14 -mt-8 grid place-items-center rounded-full",
                "bg-gradient-to-br from-emergency to-pink text-white",
                "ring-[5px] ring-card",
                "shadow-[0_6px_14px_-4px_hsl(var(--emergency)/0.55)]",
                "dark:shadow-[0_8px_18px_-6px_hsl(var(--emergency)/0.7)]",
                "transform-gpu will-change-transform",
                "transition-transform duration-300 ease-out",
                active && "scale-110",
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={2.5} />
            </div>
          </>
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
        <span className={cn(featured && "font-semibold")}>{label}</span>
      </Link>
    </li>
  );
});

export const BottomNav = memo(function BottomNav() {
  // Chỉ subscribe `activeTo` (giá trị scalar) — không subscribe full pathname
  // hay router loading state, tránh re-render thừa khi điều hướng giữa các
  // route ngoài tab và tránh crash reconciler trong lúc commit route mới.
  const activeTo = useRouterState({ select: (s) => selectActiveTo(s.location.pathname) });
  const navigate = useNavigate();
  const lastTapRef = useRef<{ to: string; at: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const onTap = useCallback(
    (to: TabTo, e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const now = Date.now();
      const last = lastTapRef.current;
      if (activeTo === to) return;
      if (last && last.to === to && now - last.at < DEBOUNCE_MS) return;
      lastTapRef.current = { to, at: now };

      // Phản hồi khẩn cấp cho nút Bảo an: rung + âm cảnh báo ngắn
      if (to === "/bao-an") {
        try {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([40, 50, 120]);
          }
        } catch {
          // ignore
        }
        try {
          playEmergencyChirp();
        } catch {
          // ignore
        }
      }

      void navigate({ to }).catch((error) => {
        if (isModuleLoadError(error)) window.location.assign(to);
        else throw error;
      });
    },
    [activeTo, navigate],
  );

  // Memo danh sách item để tránh tạo array mới mỗi render parent.
  const items = useMemo(
    () =>
      tabs.map((t) => (
        <TabItem
          key={t.to}
          to={t.to}
          label={t.label}
          Icon={t.icon}
          active={mounted && activeTo === t.to}
          featured={t.to === "/bao-an"}
          onTap={onTap}
        />
      )),
    [activeTo, mounted, onTap],
  );

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md">
      <div className="mx-3 mb-3 rounded-3xl border border-border bg-card/90 backdrop-blur-xl shadow-[var(--shadow-pop)]">
        <ul className="grid grid-cols-5">{items}</ul>
      </div>
    </nav>
  );
});
