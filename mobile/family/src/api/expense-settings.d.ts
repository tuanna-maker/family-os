export type ExpenseCategoryDef = {
  key: string;
  labelVi: string;
  labelEn: string;
  icon: string;
  color: string;
};

export type MonthBudget = {
  total: number;
  byCategory: Record<string, number>;
};

export type ExpenseSettings = {
  categories: ExpenseCategoryDef[];
  budgets: Record<string, MonthBudget>;
};

export declare function loadExpenseSettings(data: { family_id: string }): Promise<ExpenseSettings>;
export declare function saveExpenseSettings(data: {
  family_id: string;
  settings: ExpenseSettings;
}): Promise<{ ok: boolean }>;
