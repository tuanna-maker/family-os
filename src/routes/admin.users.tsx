import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, Search, Plus, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { listUsersWithRoles, assignRole } from "@/lib/admin.functions";
import { getMyContext, type AppRole } from "@/lib/auth.functions";
import { toast } from "sonner";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsersPage,
});

const ALL_ROLES: AppRole[] = [
  "super_admin",
  "family_owner",
  "family_member",
  "security_admin",
  "security_staff",
];

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

function AdminUsersPage() {
  return (
    <AdminGate>
      <AdminShell eyebrow="Quản trị" title="Người dùng & vai trò" actions={null}>
        <UsersContent />
      </AdminShell>
    </AdminGate>
  );
}

function UsersContent() {
  const [q, setQ] = useState("");
  const fetchUsers = useServerFn(listUsersWithRoles);
  const fetchCtx = useServerFn(getMyContext);

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => fetchCtx() });

  const isSuperAdmin = !!ctxQ.data?.isSuperAdmin;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = usersQ.data ?? [];
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.full_name ?? "").toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        r.roles.some((role) => role.toLowerCase().includes(term)),
    );
  }, [usersQ.data, q]);

  return (
    <>
      <div className="rounded-3xl bg-card border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              {usersQ.isLoading ? "Đang tải…" : `${filtered.length} người dùng`}
            </h2>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên, ID hoặc role…"
              className="h-10 pl-9 pr-3 w-full rounded-xl bg-muted/40 border border-border text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border overflow-hidden">
        {usersQ.isError ? (
          <p className="p-5 text-sm text-destructive">
            {(usersQ.error as Error).message}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-4 font-medium">Người dùng</th>
                  <th className="text-left p-4 font-medium">Vai trò hiện tại</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Tham gia</th>
                  <th className="text-right p-4 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UserRow key={u.id} user={u} canManageSuper={isSuperAdmin} />
                ))}
                {!usersQ.isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                      Không có người dùng phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

type UserRowData = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
};

function UserRow({ user, canManageSuper }: { user: UserRowData; canManageSuper: boolean }) {
  const qc = useQueryClient();
  const mutate = useServerFn(assignRole);
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>("family_member");

  const m = useMutation({
    mutationFn: (vars: { role: AppRole; action: "grant" | "revoke" }) =>
      mutate({ data: { target_user_id: user.id, role: vars.role, action: vars.action } }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "grant" ? "Đã cấp quyền" : "Đã thu hồi quyền");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setAdding(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const availableToGrant = ALL_ROLES.filter(
    (r) => !user.roles.includes(r) && (canManageSuper || r !== "super_admin"),
  );

  return (
    <tr className="border-t border-border align-top">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm font-semibold shrink-0">
            {(user.full_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{user.full_name || "Chưa đặt tên"}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{user.id.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {user.roles.length === 0 ? (
            <span className="text-xs text-muted-foreground">Chưa có vai trò</span>
          ) : (
            user.roles.map((r) => {
              const canRevoke = canManageSuper || r !== "super_admin";
              return (
                <span
                  key={r}
                  className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium ${ROLE_TONE[r]}`}
                >
                  {ROLE_LABEL[r]}
                  {canRevoke && (
                    <button
                      onClick={() => m.mutate({ role: r, action: "revoke" })}
                      disabled={m.isPending}
                      className="ml-0.5 h-4 w-4 rounded-full grid place-items-center hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40"
                      aria-label={`Thu hồi ${ROLE_LABEL[r]}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>
      </td>
      <td className="p-4 hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
        {new Date(user.created_at).toLocaleDateString("vi-VN")}
      </td>
      <td className="p-4 text-right">
        {adding ? (
          <div className="inline-flex items-center gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AppRole)}
              className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs"
            >
              {availableToGrant.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <button
              onClick={() => m.mutate({ role: newRole, action: "grant" })}
              disabled={m.isPending || availableToGrant.length === 0}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              Cấp
            </button>
            <button
              onClick={() => setAdding(false)}
              className="h-9 w-9 rounded-lg border border-border grid place-items-center"
              aria-label="Hủy"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              const first = availableToGrant[0];
              if (first) setNewRole(first);
              setAdding(true);
            }}
            disabled={availableToGrant.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted/40 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Cấp quyền
          </button>
        )}
      </td>
    </tr>
  );
}
