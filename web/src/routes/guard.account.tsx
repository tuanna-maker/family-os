import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Shield, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/guard/account")({
  head: () => ({ meta: [{ title: "Tài khoản — Bảo vệ" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const name = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? "Bảo vệ";
  return (
    <>
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold">Tài khoản</h1>
      </header>
      <section className="px-5">
        <div className="rounded-3xl bg-card border border-border p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-success to-brand grid place-items-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            <p className="text-[11px] text-success font-semibold mt-0.5">Nhân viên Bảo vệ</p>
          </div>
        </div>
      </section>
      <section className="px-5 mt-4">
        <ul className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          {["Thông tin cá nhân", "Cài đặt thông báo", "Hỗ trợ"].map((it) => (
            <li key={it}>
              <button className="w-full flex items-center justify-between p-4 text-sm">
                {it}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            nav({ to: "/login" });
          }}
          className="mt-4 w-full h-12 rounded-2xl bg-emergency/10 text-emergency font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </section>
    </>
  );
}
