import { useMockAuth } from "@/contexts/MockAuthContext";
import type { Permission, Role } from "@/types/core";
import type { ReactNode } from "react";

interface Props {
  permission?: Permission;
  anyPermission?: Permission[];
  roles?: Role[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditional render dựa trên RBAC. Bọc các nút Tạo / Sửa / Phân công / Resolve.
 */
export function PermissionGate({ permission, anyPermission, roles, fallback = null, children }: Props) {
  const { can, hasRole, user } = useMockAuth();
  if (!user) return <>{fallback}</>;
  if (permission && !can(permission)) return <>{fallback}</>;
  if (anyPermission && !anyPermission.some((p) => can(p))) return <>{fallback}</>;
  if (roles && !hasRole(...roles)) return <>{fallback}</>;
  return <>{children}</>;
}
