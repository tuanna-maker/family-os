export type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  spent_on: string;
  source?: string;
};

export declare function listExpenses(data: { family_id: string }): Promise<ExpenseRow[]>;
export declare function createExpense(data: unknown): Promise<unknown>;
export declare function updateExpense(data: {
  id: string;
  title: string;
  category: string;
  amount: number;
  spent_on: string;
  note?: string | null;
}): Promise<{ ok: boolean }>;
export declare function deleteExpense(data: { id: string; source?: string }): Promise<{ ok: boolean }>;
