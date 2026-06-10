import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GuardMobileShell } from "@/components/guard/GuardMobileShell";
import { GroupedSection } from "@/components/guard/ios/GroupedCard";
import { ListRow } from "@/components/guard/ios/ListRow";
import { guardProfile } from "@/features/guard-mobile/data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  Bell,
  Building2,
  HelpCircle,
  LogOut,
  Shield,
  SlidersHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/guard/me")({
  head: () => ({ meta: [{ title: "Tài khoản — STOS Guard" }] }),
  component: GuardMePage,
});

function GuardMePage() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Đã đăng xuất");
    navigate({ to: "/login" });
  }

  return (
    <GuardMobileShell largeTitle="Tài khoản" subtitle={guardProfile.id}>
      <section className="px-4 mt-2">
        <div className="rounded-[14px] bg-card border border-border p-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand to-navy grid place-items-center text-primary-foreground text-xl font-bold">
            {guardProfile.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-bold">{guardProfile.name}</p>
            <p className="text-[13px] text-muted-foreground">{guardProfile.zone}</p>
            <p className="text-[12px] text-brand font-medium mt-1">{guardProfile.shift}</p>
          </div>
        </div>
      </section>

      <GroupedSection title="Vận hành">
        <ListRow
          title="Dự án đang trực"
          value={guardProfile.project}
          icon={<Building2 className="h-4 w-4" />}
          iconBoxClassName="bg-tint-blue text-brand"
        />
        <ListRow
          title="Command Center"
          subtitle="Giám sát toàn tòa (máy tính)"
          icon={<Activity className="h-4 w-4" />}
          iconBoxClassName="bg-tint-purple text-pink"
          to="/security"
          showChevron
        />
        <ListRow
          title="Thông báo ca trực"
          icon={<Bell className="h-4 w-4" />}
          iconBoxClassName="bg-tint-orange text-warning"
          onClick={() => toast.message("Cài đặt thông báo", { description: "Phase 3." })}
          showChevron
        />
      </GroupedSection>

      <GroupedSection title="Ứng dụng">
        <ListRow
          title="Cài đặt Guard"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          iconBoxClassName="bg-muted text-muted-foreground"
          onClick={() => toast.message("Cài đặt", { description: "Phase 3." })}
          showChevron
        />
        <ListRow
          title="Trợ giúp & SOS nội bộ"
          icon={<HelpCircle className="h-4 w-4" />}
          iconBoxClassName="bg-tint-green text-success"
          onClick={() => toast.message("Hotline nội bộ: 1900 6868")}
          showChevron
        />
        <ListRow
          title="Chuyển sang STOS Life"
          subtitle="Ứng dụng cư dân"
          icon={<Shield className="h-4 w-4" />}
          iconBoxClassName="bg-brand text-primary-foreground"
          to="/home"
          showChevron
        />
      </GroupedSection>

      <GroupedSection>
        <ListRow
          title="Đăng xuất"
          destructive
          icon={<LogOut className="h-4 w-4" />}
          iconBoxClassName="bg-emergency/15 text-emergency"
          onClick={() => void signOut()}
          showChevron={false}
        />
      </GroupedSection>

      <p className="text-center text-[11px] text-muted-foreground py-8">
        STOS Guard · v1.0.0
        <br />
        <Link to="/workspaces" className="text-brand font-medium mt-1 inline-block min-h-[44px] leading-[44px]">
          Đổi workspace
        </Link>
      </p>
    </GuardMobileShell>
  );
}
