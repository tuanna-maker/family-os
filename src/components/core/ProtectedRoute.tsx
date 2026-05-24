import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMockAuth } from "@/contexts/MockAuthContext";
import type { Permission, Role } from "@/types/core";

interface Props {
  children: ReactNode;
  roles?: Role[];
  permission?: Permission;
  fallback?: ReactNode;
}

/** Client-side protected boundary using the mock auth layer. */
export function ProtectedRoute({ children, roles, permission, fallback }: Props) {
  const { user, can, hasRole } = useMockAuth();

  if (!user) return <Navigate to="/demo-login" />;
  if (roles && !hasRole(...roles)) return <>{fallback ?? <Forbidden reason="Vai trò không đủ quyền truy cập trang này." />}</>;
  if (permission && !can(permission)) return <>{fallback ?? <Forbidden reason={`Thiếu quyền: ${permission}`} />}</>;
  return <>{children}</>;
}

function Forbidden({ reason }: { reason: string }) {
  return (
    <div className="p-8 max-w-md mx-auto text-center space-y-2">
      <h2 className="text-lg font-semibold">403 · Không có quyền</h2>
      <p className="text-sm text-muted-foreground">{reason}</p>
    </div>
  );
}
