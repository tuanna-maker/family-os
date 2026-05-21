import { Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center mb-4">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-[12px] text-muted-foreground mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
