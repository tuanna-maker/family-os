import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** iOS grouped inset card (14px radius). */
export function GroupedCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-4 rounded-[14px] bg-card border border-border overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GroupedSection({
  title,
  children,
  footer,
}: {
  title?: string;
  children: ReactNode;
  footer?: string;
}) {
  return (
    <section>
      {title && (
        <p className="text-[13px] font-normal uppercase tracking-wide text-muted-foreground px-8 pb-2 pt-5">
          {title}
        </p>
      )}
      <GroupedCard>{children}</GroupedCard>
      {footer && (
        <p className="px-8 pt-2 pb-1 text-[13px] text-muted-foreground leading-snug">
          {footer}
        </p>
      )}
    </section>
  );
}
