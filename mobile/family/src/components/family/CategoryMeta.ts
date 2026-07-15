import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getStrings } from "@mobile/i18n/useI18n";
import type { ExpenseCategoryDef } from "@mobile/lib/expense-settings";
import { DEFAULT_EXPENSE_CATEGORIES, findCategory, resolveCategoryLabel } from "@mobile/lib/expense-settings";
import { normalizeCategoryKey } from "@mobile/lib/expense-category-key";

export const EXPENSE_CATEGORY_META: Record<string, { icon: string; color: string }> = {
  dining: { icon: "🍱", color: "#10B981" },
  housing: { icon: "🏠", color: "#3B82F6" },
  children: { icon: "🎒", color: "#EC4899" },
  health: { icon: "💊", color: "#EF4444" },
  entertainment: { icon: "🎬", color: "#F97316" },
  other: { icon: "✨", color: "#8B5CF6" },
};

export const BUDGET_MONTH_VND = 8_000_000;

export function getCategoryLabel(
  key: string,
  locale: AppLocale,
  categories?: ExpenseCategoryDef[],
) {
  const list = categories ?? DEFAULT_EXPENSE_CATEGORIES;
  const normalized = normalizeCategoryKey(key);
  const cat = findCategory({ categories: list, budgets: {} }, normalized);
  if (cat) return resolveCategoryLabel(cat, normalized, locale);
  const cats = getStrings(locale).expense.categories;
  return cats[normalized as keyof typeof cats] ?? cats[key as keyof typeof cats] ?? key;
}

export function getCategoryMeta(key: string, categories?: ExpenseCategoryDef[]) {
  const list = categories ?? DEFAULT_EXPENSE_CATEGORIES;
  const normalized = normalizeCategoryKey(key);
  const cat = list.find((c) => c.key === normalized || c.key === key);
  if (cat) return { icon: cat.icon, color: cat.color };
  return EXPENSE_CATEGORY_META[normalized] ?? EXPENSE_CATEGORY_META.other;
}
