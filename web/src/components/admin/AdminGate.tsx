import { type ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { requireAdmin } from "@/lib/auth.functions";

export function AdminGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(requireAdmin);

  const enabled = !loading && !!session;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["require-admin", session?.user.id],
    queryFn: () => checkAdmin(),
    enabled,
    retry: false,
  });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login", search: { redirect: "/admin" } });
    }
  }, [loading, session, navigate]);

  if (loading || (enabled && isLoading)) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Đang kiểm tra quyền truy cập…
      </div>
    );
  }

  if (!session) return null;

  if (isError || !data?.ok) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 grid place-items-center mx-auto">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Tài khoản của bạn không có vai trò quản trị. Liên hệ super admin để được cấp quyền.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
