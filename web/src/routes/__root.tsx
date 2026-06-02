import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast, Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { PagePendingSkeleton } from "@/components/PagePendingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { resolveDestinationPure } from "@/lib/resolve-destination";

import { EasyReadProvider } from "@/hooks/use-easy-read";
import { ThemeProvider } from "@/hooks/use-theme";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { startWebVitals } from "@/lib/report-web-vitals";

import appCss from "../styles.css?url";


// Tạo mã lỗi ngắn ổn định từ message để dễ tra cứu
function makeErrorCode(error: unknown): string {
  const msg = error instanceof Error ? `${error.name}:${error.message}` : String(error);
  let h = 0;
  for (let i = 0; i < msg.length; i++) h = (h * 31 + msg.charCodeAt(i)) | 0;
  return `E${(Math.abs(h) % 0xfffff).toString(16).toUpperCase().padStart(5, "0")}`;
}

function describeError(error: unknown) {
  const code = makeErrorCode(error);
  const status =
    (error as { status?: number; statusCode?: number })?.status ??
    (error as { statusCode?: number })?.statusCode;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  return { code, status, message };
}

function isModuleLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(
    message,
  );
}

function reloadOnceForModuleLoadError(error: unknown): boolean {
  if (!isModuleLoadError(error) || typeof window === "undefined") return false;
  const key = `route-module-reload:${window.location.pathname}`;
  if (window.sessionStorage.getItem(key) === "1") return false;
  window.sessionStorage.setItem(key, "1");
  window.location.reload();
  return true;
}

// Toast khi route gặp lỗi — dùng chung cho errorComponent gốc
function notifyRouteError(error: unknown, where: string) {
  const { code, status, message } = describeError(error);
  // eslint-disable-next-line no-console
  console.error(`[route-error ${code}] ${where}`, error);
  toast.error(`Lỗi điều hướng · ${code}${status ? ` · HTTP ${status}` : ""}`, {
    description: `${where} — ${message}`,
    action: {
      label: "Sao chép",
      onClick: () =>
        navigator.clipboard?.writeText(
          JSON.stringify({ code, status, where, message }, null, 2),
        ),
    },
    duration: 8000,
  });
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Cờ tự-thử-lại trong im lặng cho mỗi pathname. Cho phép tối đa
// MAX_SILENT_RETRIES lần để xử lý các lỗi transient lặp lại (hydration
// mismatch, dynamic import race, vite preload chậm) — chỉ hiển thị
// "trang lỗi" sau khi đã thật sự hết lượt retry.
const MAX_SILENT_RETRIES = 3;
function shouldSilentAutoRetry(pathname: string, error: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (isModuleLoadError(error)) return false; // đã có reload-once riêng
  const key = `route-silent-retry:${pathname}`;
  let count = 0;
  try {
    const raw = window.sessionStorage.getItem(key);
    count = raw ? parseInt(raw, 10) || 0 : 0;
  } catch { /* noop */ }
  if (count >= MAX_SILENT_RETRIES) return false;
  try {
    window.sessionStorage.setItem(key, String(count + 1));
    window.setTimeout(() => {
      try { window.sessionStorage.removeItem(key); } catch { /* noop */ }
    }, 8000);
  } catch { /* noop */ }
  return true;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { code, status, message } = describeError(error);
  const [autoRetrying, setAutoRetrying] = useState(true);

  useEffect(() => {
    if (reloadOnceForModuleLoadError(error)) return;
    const pathname = router.state.location.pathname;
    if (shouldSilentAutoRetry(pathname, error)) {
      // Đợi invalidate xong rồi mới reset để loader chạy lại trước khi
      // boundary clear, tránh remount với cùng error cũ.
      // eslint-disable-next-line no-console
      console.warn(`[route-error ${code}] silent retry on ${pathname}`);
      void router
        .invalidate({ sync: true })
        .then(() => reset())
        .catch(() => reset());
      return;
    }
    setAutoRetrying(false);
    notifyRouteError(error, pathname);
  }, [error, router, reset, code]);

  // Trong lúc auto-retry: KHÔNG hiển thị trang lỗi — chỉ giữ skeleton trống
  // để tránh "chớp" UI lỗi rồi vào trang đích.
  if (autoRetrying) {
    return <PagePendingSkeleton />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Trang chưa tải được
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mã lỗi <span className="font-mono font-semibold">{code}</span>
          {status ? ` · HTTP ${status}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground break-all">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Thử lại
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Về trang chủ

          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Global guard: nếu đã đăng nhập, chặn MỌI điều hướng về "/" (back/forward,
  // deep link, click logo, link nội bộ) và đẩy về app home tương ứng.
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    if (location.pathname !== "/") return;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const ctx = await getMyContext();
      const to = resolveDestinationPure({ ctx, requestedRedirect: null, entrySource: "landing" });
      if (to && to !== "/") throw redirect({ to, replace: true });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "STOS - Hệ điều hành chung cư" },
      { name: "description", content: "Hệ điều hành chung cư" },
      { name: "author", content: "STOS" },
      { property: "og:title", content: "STOS - Hệ điều hành chung cư" },
      { property: "og:description", content: "Hệ điều hành chung cư" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@STOS" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('ui:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RouterErrorWatcher() {
  const router = useRouter();
  useEffect(() => {
    const onPreloadError = (e: Event) => {
      const error = (e as Event & { payload?: unknown }).payload;
      if (reloadOnceForModuleLoadError(error)) e.preventDefault();
    };
    // Lắng nghe sự kiện loader/navigation báo lỗi từ TanStack Router
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      window.sessionStorage.removeItem(`route-module-reload:${toLocation.pathname}`);
      const errored = router.state.matches.find((m) => m.status === "error" && m.error);
      if (errored) {
        if (reloadOnceForModuleLoadError(errored.error)) return;
        notifyRouteError(errored.error, toLocation.pathname);
      }
    });
    // Bắt lỗi runtime chưa được boundary nuốt
    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (reloadOnceForModuleLoadError(e.reason)) {
        e.preventDefault();
        return;
      }
      notifyRouteError(e.reason, router.state.location.pathname);
    };
    const onError = (e: ErrorEvent) => {
      const error = e.error ?? e.message;
      if (reloadOnceForModuleLoadError(error)) e.preventDefault();
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onError);
    return () => {
      unsub();
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onError);
    };
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { startWebVitals(); }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MockAuthProvider>
          <TenantProvider>
            <ThemeProvider>
              <EasyReadProvider>
                <Outlet />
                <RouterErrorWatcher />
                <Toaster richColors closeButton position="top-center" />
                
              </EasyReadProvider>
            </ThemeProvider>
          </TenantProvider>
        </MockAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
