import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { family } from "@/features/family-core";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  Globe,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/tai-khoan")({
  head: () => ({ meta: [{ title: "Tài khoản — STOS Life" }] }),
  component: AccountPage,
});

type SettingItem = {
  icon: LucideIcon;
  label: string;
  to?: "/admin";
  value?: string;
};

const SETTINGS: SettingItem[] = [
  { icon: Bell, label: "Thông báo" },
  { icon: Lock, label: "Bảo mật & quyền riêng tư" },
  { icon: Moon, label: "Giao diện" },
  { icon: Globe, label: "Ngôn ngữ", value: "Tiếng Việt" },
  { icon: LayoutDashboard, label: "Bảng quản trị (Admin)", to: "/admin" },
  { icon: HelpCircle, label: "Hỗ trợ" },
];

function AccountPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };
  return (
    <MobileShell>
      <PageHeader title="Tài khoản" back={false} />

      <section className="px-4">
        <RoundedCard className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand to-pink grid place-items-center text-3xl shrink-0">
            👩🏻
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold">Mẹ Linh</p>
            <p className="text-xs text-muted-foreground truncate">{family.apartment}</p>
            <p className="text-[11px] text-brand font-medium mt-1">Chủ hộ • Premium</p>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <RoundedCard className="p-0 divide-y divide-border">
          {SETTINGS.map(({ icon: Icon, label, value, to }) => {
            const content = (
              <div className="w-full flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-2xl bg-muted grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium truncate">{label}</span>
                {value && <span className="text-xs text-muted-foreground shrink-0">{value}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
            return to ? (
              <Link key={label} to={to} className="block active:bg-muted/40">
                {content}
              </Link>
            ) : (
              <button key={label} className="w-full text-left active:bg-muted/40">
                {content}
              </button>
            );
          })}
        </RoundedCard>

        <button
          onClick={handleSignOut}
          className="mt-4 w-full rounded-2xl bg-card border border-border p-4 flex items-center justify-center gap-2 text-sm font-semibold text-emergency active:bg-muted/40"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          STOS Life • Phiên bản 1.0.0
        </p>
      </section>
    </MobileShell>
  );
}
