import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { ROLES } from "@/constants/permissions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/demo-login")({
  head: () => ({ meta: [{ title: "Demo Login — STOS Life" }] }),
  component: DemoLogin,
});

function DemoLogin() {
  const { users, signIn, user } = useMockAuth();
  const nav = useNavigate();

  const go = (id: string) => {
    signIn(id);
    const u = users.find((x) => x.id === id)!;
    toast.success(`Đăng nhập demo: ${ROLES[u.role].name}`);
    const dest = u.role === "super_admin" || u.role === "tenant_admin" ? "/saas"
      : u.role === "resident" || u.role === "head_of_household" ? "/portal"
      : "/bql";
    nav({ to: dest });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Demo mode</p>
          <h1 className="text-2xl font-bold mt-1">Chọn vai trò để khám phá STOS Life</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Mock auth — không cần mật khẩu. Vai trò xác định quyền, sidebar, và phạm vi tenant.
          </p>
          {user && (
            <p className="text-[12px] text-success mt-2">
              Đang đăng nhập: <b>{user.fullName}</b> · {ROLES[user.role].name}
            </p>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {users.map((u) => {
            const r = ROLES[u.role];
            return (
              <button key={u.id} onClick={() => go(u.id)}
                className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.scope}</span>
                </div>
                <p className="mt-2 text-[14px] font-semibold">{u.fullName}</p>
                <p className="text-[12px] text-muted-foreground">{u.email}</p>
                <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{r.description}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-4 text-center">
          <Button variant="link" onClick={() => nav({ to: "/" })}>← Về trang chủ</Button>
        </div>
      </div>
    </div>
  );
}
