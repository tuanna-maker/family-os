export type {
  ExpenseCategoryDef,
  ExpenseSettings,
  MonthBudget,
} from "@mobile/api/expense-settings";

export {
  DEFAULT_EXPENSE_CATEGORIES,
  findCategory,
  getMonthBudget,
  monthKey,
  monthRangeLabel,
  resolveCategoryLabel,
} from "./expense-settings-helpers";

export {
  LEGACY_VI_CATEGORY_KEYS,
  normalizeCategoryKey,
  slugifyCategoryKey,
  isValidCategoryKey,
} from "./expense-category-key";

import {
  loadExpenseSettings as loadExpenseSettingsApi,
  saveExpenseSettings as saveExpenseSettingsApi,
  type ExpenseSettings,
} from "@mobile/api/expense-settings";

export async function loadExpenseSettings(familyId: string): Promise<ExpenseSettings> {
  return loadExpenseSettingsApi({ family_id: familyId });
}

export async function saveExpenseSettings(familyId: string, settings: ExpenseSettings) {
  return saveExpenseSettingsApi({ family_id: familyId, settings });
}
