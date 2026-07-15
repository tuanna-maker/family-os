import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@shared/utils";
import { Label } from "../ui/label";

const MONTHS_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function parseLocalDateTime(value: string) {
  if (!value) {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate(), h: 9, min: 0 };
  }
  const [datePart, timePart] = value.split("T");
  const [y, m, day] = (datePart ?? "").split("-").map(Number);
  const [h, min] = (timePart ?? "09:00").split(":").map(Number);
  return {
    y: y || new Date().getFullYear(),
    m: m || 1,
    day: day || 1,
    h: Number.isFinite(h) ? h : 9,
    min: Number.isFinite(min) ? min : 0,
  };
}

export function toLocalDateTimeString(parts: { y: number; m: number; day: number; h: number; min: number }) {
  return `${parts.y}-${pad(parts.m)}-${pad(parts.day)}T${pad(parts.h)}:${pad(parts.min)}`;
}

export function formatDateVi(value: string) {
  const { y, m, day } = parseLocalDateTime(value);
  return `${pad(day)}/${pad(m)}/${y}`;
}

export function formatDateTimeVi(value: string) {
  const p = parseLocalDateTime(value);
  return `${pad(p.day)}/${pad(p.m)}/${p.y} · ${pad(p.h)}:${pad(p.min)}`;
}

type DateParts = ReturnType<typeof parseLocalDateTime>;

const selectClass =
  "w-full h-12 rounded-xl border border-border bg-background text-sm font-medium text-center appearance-none touch-manipulation cursor-pointer relative z-10";

function WheelSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number | string;
  options: { value: number | string; label: string }[];
  onChange: (v: number | string) => void;
}) {
  return (
    <div className="flex-1 min-w-0 space-y-1 relative z-10">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          onChange(Number.isNaN(n) ? raw : n);
        }}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateTimePanel({
  draft,
  setDraft,
  showTime,
  onApply,
}: {
  draft: DateParts;
  setDraft: Dispatch<SetStateAction<DateParts>>;
  showTime: boolean;
  onApply?: (parts: DateParts) => void;
}) {
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => y - 1 + i);
  }, []);

  const daysInMonth = new Date(draft.y, draft.m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const update = (fn: (p: DateParts) => DateParts) => {
    setDraft((prev) => {
      const next = fn(prev);
      onApply?.(next);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border relative z-10">
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">Ngày</p>
        <div className="flex gap-2">
          <WheelSelect
            label="Ngày"
            value={Math.min(draft.day, daysInMonth)}
            options={days.map((d) => ({ value: d, label: String(d) }))}
            onChange={(d) => update((p) => ({ ...p, day: d as number }))}
          />
          <WheelSelect
            label="Tháng"
            value={draft.m}
            options={MONTHS_VI.map((name, i) => ({ value: i + 1, label: name }))}
            onChange={(m) => update((p) => ({ ...p, m: m as number }))}
          />
          <WheelSelect
            label="Năm"
            value={draft.y}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            onChange={(y) => update((p) => ({ ...p, y: y as number }))}
          />
        </div>
      </div>
      {showTime && (
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Giờ</p>
          <div className="flex gap-2 max-w-[240px]">
            <WheelSelect
              label="Giờ"
              value={draft.h}
              options={hours.map((h) => ({ value: h, label: pad(h) }))}
              onChange={(h) => update((p) => ({ ...p, h: h as number }))}
            />
            <WheelSelect
              label="Phút"
              value={draft.min}
              options={minutes.map((m) => ({ value: m, label: pad(m) }))}
              onChange={(m) => update((p) => ({ ...p, min: m as number }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Luôn hiển thị bộ chọn — không cần bấm mở (ổn định trên Android WebView). */
export function DatePickerField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(() => parseLocalDateTime(value ? `${value}T00:00` : ""));

  useEffect(() => {
    setDraft(parseLocalDateTime(value ? `${value}T00:00` : ""));
  }, [value]);

  return (
    <div className={cn("space-y-2 relative z-0", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {value && (
        <p className="text-sm text-muted-foreground px-1">{formatDateVi(`${value}T00:00`)}</p>
      )}
      <DateTimePanel
        draft={draft}
        setDraft={setDraft}
        showTime={false}
        onApply={(p) => onChange(`${p.y}-${pad(p.m)}-${pad(p.day)}`)}
      />
    </div>
  );
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  className,
  collapsible = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  /** true = bấm để mở (có thể lỗi trên một số WebView). Mặc định false = luôn hiện. */
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseLocalDateTime(value));

  useEffect(() => {
    setDraft(parseLocalDateTime(value));
  }, [value]);

  const apply = (p: DateParts) => onChange(toLocalDateTimeString(p));

  if (!collapsible) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-sm font-medium">{label}</Label>
        {value && (
          <p className="text-sm font-medium text-foreground px-1">{formatDateTimeVi(value)}</p>
        )}
        <DateTimePanel draft={draft} setDraft={setDraft} showTime onApply={apply} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full min-h-12 px-4 rounded-2xl border border-border bg-card text-left text-base",
          "flex items-center justify-between gap-2 touch-manipulation cursor-pointer relative z-10",
          open && "border-brand ring-1 ring-brand/30",
        )}
      >
        <span>{value ? formatDateTimeVi(value) : "Chọn…"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <DateTimePanel
          draft={draft}
          setDraft={setDraft}
          showTime
          onApply={(p) => {
            apply(p);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
