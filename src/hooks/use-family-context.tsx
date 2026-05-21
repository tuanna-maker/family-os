import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMyContext } from "@/lib/auth.functions";

/** Hook returning the current user's family id + helpers. Redirects to /login if signed-out. */
export function useFamilyContext() {
  const getCtx = useServerFn(getMyContext);
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx() });

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
