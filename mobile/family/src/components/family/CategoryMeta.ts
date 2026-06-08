import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getStrings } from "@mobile/i18n/useI18n";

export const EXPENSE_CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Ăn uống": { icon: "🍱", color: "#10B981" },
  "Nhà cửa": { icon: "🏠", color: "#3B82F6" },
  "Con cái": { icon: "🎒", color: "#EC4899" },
  "Sức khỏe": { icon: "💊", color: "#EF4444" },
  "Giải trí": { icon: "🎬", color: "#F97316" },
  "Khác": { icon: "✨", color: "#8B5CF6" },
};

export const BUDGET_MONTH_VND = 25_000_000;

export function getCategoryLabel(key: string, locale: AppLocale): string {
  const cats = getStrings(locale).expense.categories;
  return cats[key as keyof typeof cats] ?? cats["Khác"];
}

export function getCategoryMeta(key: string) {
  return EXPENSE_CATEGORY_META[key] ?? EXPENSE_CATEGORY_META["Khác"];
}
