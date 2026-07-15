import { useQuery } from "@tanstack/react-query";
import { getMyContext } from "@guard/api/auth";

export function useGuardMyContext() {
  return useQuery({
    queryKey: ["guard-my-context"],
    queryFn: () => getMyContext(),
    staleTime: 60_000,
  });
}
