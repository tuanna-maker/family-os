import type { ExpenseCategoryDef, ExpenseSettings, MonthBudget } from "@mobile/api/expense-settings";
import { normalizeCategoryKey } from "./expense-category-key";

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { key: "dining", labelVi: "Ăn uống", labelEn: "Dining", icon: "🍱", color: "#10B981" },
  { key: "housing", labelVi: "Nhà cửa", labelEn: "Housing", icon: "🏠", color: "#3B82F6" },
  { key: "children", labelVi: "Con cái", labelEn: "Children", icon: "🎒", color: "#EC4899" },
  { key: "health", labelVi: "Sức khỏe", labelEn: "Health", icon: "💊", color: "#EF4444" },
  { key: "entertainment", labelVi: "Giải trí", labelEn: "Entertainment", icon: "🎬", color: "#F97316" },
  { key: "other", labelVi: "Khác", labelEn: "Other", icon: "✨", color: "#8B5CF6" },
  { key: "daily", labelVi: "Chi tiêu hàng ngày", labelEn: "Daily spending", icon: "🧴", color: "#22C55E" },
  { key: "shopping", labelVi: "Mua sắm", labelEn: "Shopping", icon: "🛍️", color: "#A16207" },
  { key: "cosmetics", labelVi: "Mỹ phẩm", labelEn: "Cosmetics", icon: "💄", color: "#EC4899" },
  { key: "going_out", labelVi: "Đi chơi", labelEn: "Going out", icon: "🎫", color: "#EAB308" },
  { key: "education", labelVi: "Giáo dục", labelEn: "Education", icon: "📚", color: "#DC2626" },
  { key: "electric", labelVi: "Tiền điện", labelEn: "Electricity", icon: "💡", color: "#2563EB" },
  { key: "transport", labelVi: "Đi lại", labelEn: "Transport", icon: "🚗", color: "#78350F" },
  { key: "communication", labelVi: "Phí liên lạc", labelEn: "Communication", icon: "📱", color: "#6B7280" },
  { key: "travel_save", labelVi: "Tiết kiệm đi du lịch", labelEn: "Travel savings", icon: "🚆", color: "#CA8A04" },
];

export function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function monthRangeLabel(year: number, month: number, locale: "vi" | "en") {
  const last = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  const yy = year;
  if (locale === "en") {
    return `${mm}/${yy} (${mm}/01 — ${mm}/${String(last).padStart(2, "0")})`;
  }
  return `${mm}/${yy} (${String(1).padStart(2, "0")}/${mm} — ${String(last).padStart(2, "0")}/${mm})`;
}

export function getMonthBudget(settings: ExpenseSettings, year: number, month: number): MonthBudget {
  const b = settings.budgets[monthKey(year, month)];
  if (b) return b;
  return { total: 0, byCategory: {} };
}

export function resolveCategoryLabel(
  cat: ExpenseCategoryDef | undefined,
  key: string,
  locale: "vi" | "en",
) {
  if (cat) return locale === "en" ? cat.labelEn : cat.labelVi;
  return key;
}

export function findCategory(settings: ExpenseSettings, key: string) {
  const normalized = normalizeCategoryKey(key);
  return settings.categories.find((c) => c.key === key || c.key === normalized);
}
