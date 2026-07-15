import { useQuery } from "@tanstack/react-query";
import { getMyContext } from "@shared/supabase/auth";

export function useFamilyContext() {
  const ctx = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getMyContext(),
    staleTime: 5 * 60_000,
  });

  return {
    familyId: ctx.data?.family?.id ?? null,
    family: ctx.data?.family ?? null,
    profile: ctx.data?.profile ?? null,
    isLoading: ctx.isLoading,
    error: ctx.error,
  };
}
