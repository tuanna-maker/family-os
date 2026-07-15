import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Users,
  Shield,
  Home,
  Activity,
  AlertTriangle,
  Loader2,
  Crown,
  ArrowRight,
  History,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { requireAuth } from "@/lib/require-auth";
import { getSuperAdminStats } from "@/lib/super-admin.functions";
import { getMyContext, type AppRole } from "@/lib/auth.functions";

export const Route = createFileRoute("/admin/super")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Super Admin — STOS Life" }] }),
  component: SuperAdminPage,
});

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  family_owner: "Chủ gia đình",
  family_member: "Thành viên",
  security_admin: "Bảo an Admin",
  security_staff: "Bảo an",
};

const ROLE_TONE: Record<AppRole, string> = {
  super_admin: "bg-pink/15 text-pink",
  family_owner: "bg-tint-blue text-brand",
  family_member: "bg-muted text-foreground",
  security_admin: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  security_staff: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function SuperAdminPage() {
  return (
    <AdminGate>
      <AdminShell
        eyebrow="Super Admin"
        title="Trung tâm điều hành toàn hệ thống"
        actions={
          <Link
            to="/admin/users"
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            Quản lý người dùng <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <SuperContent />
      </AdminShell>
    </AdminGate>
  );
}

function SuperContent() {
  const navigate = useNavigate();
  const fetchCtx = useServerFn(getMyContext);
  const fetchStats = useServerFn(getSuperAdminStats);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => fetchCtx() });
  const statsQ = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: () => fetchStats(),
    enabled: ctxQ.data?.isSuperAdmin === true,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (ctxQ.data && !ctxQ.data.isSuperAdmin) {
      navigate({ to: "/admin", replace: true });
    }
  }, [ctxQ.data, navigate]);

  if (ctxQ.isLoading) {
    return (
      <div className="h-64 grid place-items-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!ctxQ.data?.isSuperAdmin) {
    return (
      <div className="rounded-3xl bg-card border border-border p-8 text-center">
        <Crown className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="mt-3 font-semibold">Khu vực dành cho Super Admin</p>
        <p className="text-sm text-muted-foreground">
          Bạn không có quyền truy cập trang này.
        </p>
      </div>
    );
  }

  if (statsQ.isLoading) {
    return (
      <div className="h-64 grid place-items-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <div className="rounded-3xl bg-emergency/10 border border-emergency/30 p-5 text-sm text-emergency">
        Không tải được dữ liệu: {(statsQ.error as Error)?.message ?? "lỗi không xác định"}
      </div>
    );
  }

  const s = statsQ.data;
  const totalRoles = Object.values(s.role_distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Users}
          label="Người dùng"
          value={s.users_total}
          hint={`+${s.users_30d} trong 30 ngày`}
          tint="bg-tint-blue"
          color="text-brand"
        />
        <Kpi
          icon={Home}
          label="Gia đình đang hoạt động"
          value={s.families_total}
          tint="bg-tint-green"
          color="text-success"
        />
        <Kpi
          icon={AlertTriangle}
          label="Yêu cầu an ninh mở"
          value={s.security.open + s.security.in_progress}
          hint={`${s.security.open} mở · ${s.security.in_progress} đang xử lý`}
          tint="bg-tint-orange"
          color="text-warning"
        />
        <Kpi
          icon={Activity}
          label="An ninh 30 ngày"
          value={s.security.total_30d}
          hint={`${s.security.resolved_today} đã xử lý hôm nay`}
          tint="bg-tint-purple"
          color="text-pink"
        />
      </div>

      {/* Role distribution + security overview */}
      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Phân bổ vai trò</h2>
            </div>
            <Link
              to="/admin/users"
              className="text-xs text-brand font-semibold hover:underline"
            >
              Quản lý
            </Link>
          </div>
          <ul className="space-y-3">
            {(Object.keys(s.role_distribution) as AppRole[]).map((role) => {
              const count = s.role_distribution[role];
              const pct = Math.round((count / totalRoles) * 100);
              return (
                <li key={role}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_TONE[role]}`}
                    >
                      {ROLE_LABEL[role]}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand to-pink"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-3xl bg-card border border-border p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Security Core</h2>
          </div>
          <div className="space-y-3 text-sm">
            <StatRow label="Mở" value={s.security.open} tone="text-emergency" />
            <StatRow
              label="Đang xử lý"
              value={s.security.in_progress}
              tone="text-warning"
            />
            <StatRow
              label="Đã xử lý hôm nay"
              value={s.security.resolved_today}
              tone="text-success"
            />
            <StatRow
              label="Tổng 30 ngày"
              value={s.security.total_30d}
              tone="text-foreground"
            />
            <StatRow
              label="Nhân sự an ninh"
              value={
                s.role_distribution.security_admin + s.role_distribution.security_staff
              }
              tone="text-pink"
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-semibold">
            <Link
              to="/admin/security"
              className="h-10 rounded-xl bg-muted/60 hover:bg-muted grid place-items-center"
            >
              Trung tâm SC
            </Link>
            <Link
              to="/admin/users"
              className="h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center"
            >
              Cấp quyền
            </Link>
          </div>
        </div>
      </div>

      {/* Recent role changes */}
      <div className="mt-6 rounded-3xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Nhật ký phân quyền gần đây</h2>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs text-brand font-semibold hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
        {s.recent_role_changes.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Chưa có thay đổi nào được ghi nhận.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {s.recent_role_changes.map((row) => {
              const isGrant = row.action.endsWith(".grant");
              return (
                <li
                  key={row.id}
                  className="p-4 flex items-center gap-3 text-sm"
                >
                  <span
                    className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${
                      isGrant
                        ? "bg-success/10 text-success"
                        : "bg-emergency/10 text-emergency"
                    }`}
                  >
                    {isGrant ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {row.actor_name ?? "Hệ thống"}{" "}
                      <span className="text-muted-foreground font-normal">
                        {isGrant ? "đã cấp" : "đã thu hồi"}
                      </span>{" "}
                      {row.role && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ${ROLE_TONE[row.role]}`}
                        >
                          {ROLE_LABEL[row.role]}
                        </span>
                      )}{" "}
                      <span className="text-muted-foreground font-normal">cho</span>{" "}
                      {row.target_name ?? row.target_id?.slice(0, 8) ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(row.created_at).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tint,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  tint: string;
  color: string;
}) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <div className={`h-10 w-10 rounded-2xl ${tint} grid place-items-center mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value.toLocaleString("vi-VN")}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
