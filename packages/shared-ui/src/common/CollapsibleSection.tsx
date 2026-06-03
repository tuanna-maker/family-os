import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@shared/utils";

/**
 * CollapsibleSection — section có thể đóng/mở với chevron xoay đúng hướng.
 * Dùng useState thay vì Radix Collapsible để tránh lỗi CSS selector.
 */
export function CollapsibleSection({
  title,
  titleClassName,
  action,
  defaultOpen = true,
  children,
  className,
}: {
  title: ReactNode;
  titleClassName?: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 outline-none touch-manipulation"
        >
          <span className={titleClassName}>{title}</span>
          <ChevronRight
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0",
              open ? "rotate-90" : "rotate-0",
            )}
          />
        </button>
        {action}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
