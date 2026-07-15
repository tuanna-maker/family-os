import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMyContext } from "@/api/auth";

/** Hook returning the current user's family id + helpers. Redirects to /login if signed-out. */
export function useFamilyContext() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getMyContext(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  useEffect(() => {
    if (q.error && (q.error as Error).message?.includes("Unauthorized")) {
      navigate({ to: "/login" });
    }
  }, [q.error, navigate]);

  return {
    familyId: q.data?.family?.id ?? null,
    family: q.data?.family ?? null,
    isLoading: q.isLoading,
    error: q.error as Error | null,
  };
}
