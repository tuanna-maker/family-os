import type { ReactNode } from "react";
import { cn } from "@shared/utils";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { DatePickerField, DateTimePickerField } from "./date-time-picker";

const fieldInput =
  "h-12 rounded-2xl border-border bg-card text-base shadow-none focus-visible:ring-brand/40";

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function FormTextInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(fieldInput, props.className)} />;
}

export function FormTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={cn("rounded-2xl border-border bg-card min-h-[100px] text-base shadow-none", props.className)}
    />
  );
}

/** Chọn ngày (hoặc ngày+giờ) — UI tiếng Việt, không icon lịch / mũi tên native. */
export function DateField({
  label,
  type = "date",
  className,
  value = "",
  onChange,
}: {
  label: string;
  type?: "date" | "datetime-local";
  className?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
}) {
  const v = value ?? "";
  const handle = (next: string) => onChange?.({ target: { value: next } });

  if (type === "datetime-local") {
    return (
      <DateTimePickerField label={label} value={v} onChange={handle} className={className} />
    );
  }

  const dateOnly = v.includes("T") ? v.split("T")[0] : v;
  return (
    <DatePickerField
      label={label}
      value={dateOnly}
      onChange={(d) => handle(d)}
      className={className}
    />
  );
}

export function FormScreen({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
      <div className="flex-1 px-4 mt-3 pb-6 space-y-5">{children}</div>
      {footer && (
        <div className="sticky bottom-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}

export function FormPrimaryButton({
  children,
  className,
  type = "submit",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        "w-full h-12 rounded-2xl bg-brand text-white font-semibold text-[15px]",
        "disabled:opacity-50 active:scale-[0.99] transition",
        className,
      )}
    >
      {children}
    </button>
  );
}
