import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: ReactNode;
  iconBoxClassName?: string;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  className?: string;
};

/** iOS Settings-style row — min 44pt tap target. */
export function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconBoxClassName,
  to,
  onClick,
  destructive,
  showChevron = !!(to || onClick),
  className,
}: ListRowProps) {
  const inner = (
    <>
      {icon && (
        <div
          className={cn(
            "h-[30px] w-[30px] rounded-[7px] grid place-items-center shrink-0",
            iconBoxClassName ?? "bg-brand text-primary-foreground",
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <p
          className={cn(
            "text-[15px] font-medium leading-snug",
            destructive ? "text-emergency" : "text-foreground",
          )}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {value && (
        <span className="text-[15px] text-muted-foreground shrink-0 mr-1">
          {value}
        </span>
      )}
      {showChevron && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
      )}
    </>
  );

  const rowClass = cn(
    "flex items-center gap-3 min-h-[44px] px-4 py-2.5 w-full",
    "border-b border-border last:border-b-0",
    "active:bg-muted/50 transition-colors",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={rowClass}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {inner}
      </button>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}
