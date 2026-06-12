import { monthKey } from "@mobile/lib/expense-settings";

export function inExpenseMonth(spentOn: string, year: number, month: number) {
  const normalized = normalizeSpentOn(spentOn);
  return normalized.slice(0, 7) === monthKey(year, month);
}

/** Chỉ giao dịch đã ghi sổ — bỏ hoá đơn quét chưa lưu. */
export function isRecordedExpense(row: { source?: string }) {
  return row.source !== "scan";
}

export function normalizeSpentOn(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s || s === "Hôm nay" || s.toLowerCase() === "today") {
    return new Date().toISOString().slice(0, 10);
  }
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}
