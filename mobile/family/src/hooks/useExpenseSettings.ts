import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadExpenseSettings,
  saveExpenseSettings,
  type ExpenseSettings,
  type MonthBudget,
} from "@mobile/lib/expense-settings";

export function useExpenseSettings(familyId: string | null | undefined) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["expense-settings", familyId],
    queryFn: () => loadExpenseSettings(familyId!),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  const saveMut = useMutation({
    mutationFn: (next: ExpenseSettings) => saveExpenseSettings(familyId!, next),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["expense-settings", familyId] }),
  });

  const update = (patch: (prev: ExpenseSettings) => ExpenseSettings) => {
    const prev = q.data;
    if (!prev || !familyId) return;
    const next = patch(prev);
    saveMut.mutate(next);
    qc.setQueryData(["expense-settings", familyId], next);
  };

  return { settings: q.data, isLoading: q.isLoading, update, saveMut };
}

export type { ExpenseSettings, MonthBudget };
