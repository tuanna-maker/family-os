import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard } from "@shared/ui/common/RoundedCard";
import { useAuth } from "@shared/ui/hooks/use-auth";
import { useTheme } from "@shared/ui/hooks/use-theme";
import { supabase } from "@shared/supabase/client";
import { getMyContext } from "@/api/auth";
import { toast } from "sonner";
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
  to?: "/admin" | "/cai-dat/thong-bao";
  action?: "theme" | "support";
  value?: string;
};

const SETTINGS: SettingItem[] = [
  { icon: Bell, label: "Thông báo", to: "/cai-dat/thong-bao" },
  { icon: Lock, label: "Bảo mật & quyền riêng tư", to: "/cai-dat/thong-bao" },
  { icon: Moon, label: "Giao diện", action: "theme" },
  { icon: Globe, label: "Ngôn ngữ", value: "Tiếng Việt" },
  { icon: LayoutDashboard, label: "Bảng quản trị (Admin)", to: "/admin" },
  { icon: HelpCircle, label: "Hỗ trợ", action: "support" },
];

function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getMyContext(),
    staleTime: 5 * 60_000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, email, apartment_no, building_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Người dùng";
  const initial = displayName.charAt(0).toUpperCase();
  const apartmentLine = [profile?.apartment_no, profile?.building_name]
    .filter(Boolean)
    .join(", ");
  const subtitle = apartmentLine || profile?.email || user?.email || "";
  const isOwner = ctxQ.data?.roles?.includes("family_owner");
  const tierLabel = isOwner ? "Chủ hộ • Premium" : "Thành viên • Premium";

  const handleSetting = (item: SettingItem) => {
    if (item.action === "theme") {
      toggle();
      toast.success(theme === "dark" ? "Đã bật giao diện sáng" : "Đã bật giao diện tối");
    } else if (item.action === "support") {
      window.location.href = "mailto:hotro@securitytech.vn?subject=STOS%20Life%20Hỗ%20trợ";
    }
  };

  return (
    <MobileShell>
      <PageHeader title="Tài khoản" back="/gia-dinh" />

      <section className="px-4">
        <RoundedCard className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand to-pink grid place-items-center text-2xl font-semibold text-white shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{displayName}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
            <p className="text-[11px] text-brand font-medium mt-1">{tierLabel}</p>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <RoundedCard className="p-0 divide-y divide-border">
          {SETTINGS.map(({ icon: Icon, label, value, to, action }) => {
            const content = (
              <div className="w-full flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-2xl bg-muted grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium truncate">{label}</span>
                {action === "theme" && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {theme === "dark" ? "Tối" : "Sáng"}
                  </span>
                )}
                {value && <span className="text-xs text-muted-foreground shrink-0">{value}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
            if (to) {
              return (
                <Link key={label} to={to as any} className="block active:bg-muted/40">
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleSetting({ icon: Icon, label, value, action })}
                className="w-full text-left active:bg-muted/40"
              >
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
