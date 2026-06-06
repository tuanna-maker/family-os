import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { deleteHealthRow } from "@mobile/api/health";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";

export function isPersistedHealthId(id: string) {
  return !!id && !id.startsWith("pilot-") && id.length > 8;
}

export function useHealthMutations(back: string) {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["health-overview", familyId] });

  const del = useMutation({
    mutationFn: deleteHealthRow,
    onSuccess: () => {
      invalidate();
      toast.success("Đã xóa");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openForm = (params: Record<string, string | undefined>) => {
    router.push({
      pathname: "/suc-khoe/them",
      params: { ...params, back },
    } as never);
  };

  return { openForm, deleteRow: del.mutate, isPersistedHealthId };
}
