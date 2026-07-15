import { ErrorBoundary } from "@sentry/react";
import type { ReactNode } from "react";

function SentryFallback({
  error,
  resetError,
}: {
  error: unknown;
  resetError: () => void;
}) {
  const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không mong muốn.";
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
      <p className="text-lg font-bold text-foreground">Ứng dụng gặp sự cố</p>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      <button
        type="button"
        onClick={resetError}
        className="min-h-12 px-6 rounded-xl bg-brand text-white font-semibold touch-manipulation active:scale-[0.98]"
      >
        Thử lại
      </button>
    </div>
  );
}

export function SentryAppRoot({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={SentryFallback} showDialog={false}>
      {children}
    </ErrorBoundary>
  );
}
