import { useEffect } from "react";
import { useAuth } from "@shared/ui/hooks/use-auth";
import { initNativePush } from "@shared/supabase";

export function PushInit() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) return;
    void initNativePush("guard").catch(() => {});
  }, [session?.user?.id]);

  return null;
}
