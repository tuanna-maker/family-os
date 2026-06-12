import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { localeTag } from "@mobile/i18n/format";
import type { MonthBudget } from "@mobile/lib/expense-settings";

export function parseAmountDigits(raw: string): number {
  const n = parseInt(String(raw).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatAmountDigits(n: number, locale: AppLocale = "vi"): string {
  if (!n) return "";
  return n.toLocaleString(localeTag(locale));
}

/** Format while typing — keeps only digits, displays with locale separators. */
export function formatAmountInputChange(raw: string, locale: AppLocale = "vi"): string {
  const n = parseAmountDigits(raw);
  if (!n) return "";
  return formatAmountDigits(n, locale);
}

export function resolveMonthBudgetTotal(b: MonthBudget): number {
  const catSum = Object.values(b.byCategory).reduce((s, n) => s + n, 0);
  return b.total > 0 ? b.total : catSum;
}
