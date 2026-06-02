import type { ReactNode } from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";

export function LoadingState({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-2xl bg-destructive/5 text-destructive text-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="h-12 w-12 mx-auto rounded-2xl bg-muted grid place-items-center text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
