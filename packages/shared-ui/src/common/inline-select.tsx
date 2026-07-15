import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@shared/utils";

export type InlineSelectOption = {
  value: string;
  label: string;
  icon?: string;
};

type InlineSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: InlineSelectOption[];
  placeholder?: string;
  className?: string;
};

/** Dropdown mở inline — đẩy nội dung phía dưới xuống, không dùng portal overlay. */
export function InlineSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Chọn…",
  className,
}: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full min-h-12 px-4 rounded-2xl border border-border bg-card text-sm",
          "flex items-center justify-between gap-2 text-left transition",
          open && "border-brand ring-1 ring-brand/30",
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? (
            <>
              {selected.icon && <span className="mr-2">{selected.icon}</span>}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-sm">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm transition active:bg-muted/60",
                  active && "bg-tint-blue/50",
                )}
              >
                {o.icon && <span className="text-lg shrink-0">{o.icon}</span>}
                <span className="flex-1 font-medium">{o.label}</span>
                {active && <Check className="h-4 w-4 text-brand shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
