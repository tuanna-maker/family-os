import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pill, Bell, Save, Type, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState } from "@shared/ui/common/States";
import { Switch } from "@shared/ui/ui/switch";
import { Input } from "@shared/ui/ui/input";
import { Button } from "@shared/ui/ui/button";
import { getMyPrefs, updateMyPrefs, listFamilyPrefs, type NotificationPrefs } from "@/api/notification-prefs";
import { useEasyRead } from "@shared/ui/hooks/use-easy-read";
import { useTheme } from "@shared/ui/hooks/use-theme";
import { requireAuth } from "@/api/require-auth";

import { PageHeader } from "@shared/ui/common/PageHeader";

export const Route = createFileRoute("/cai-dat/thong-bao")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Cài đặt thông báo" }] }),
  component: NotifSettingsPage,
});

function NotifSettingsPage() {
    
  const me = useQuery({ queryKey: ["np", "me"], queryFn: () => getMyPrefs() });
  const fam = useQuery({ queryKey: ["np", "family"], queryFn: () => listFamilyPrefs() });

  return (
    <MobileShell>
      <PageHeader 
        eyebrow="Cài đặt" 
        title="Thông báo" 
        subtitle="Bật/tắt theo loại và chọn khung giờ được phép gửi." 
        back="/gia-dinh"
      />

      <section className="px-4 space-y-3">
        <SectionHeader title="Hiển thị" />
        <ThemeCard />
        <EasyReadCard />
      </section>

      <section className="px-4 mt-4">
        <SectionHeader title="Của tôi" />
        {me.isLoading && <LoadingState />}
        {me.error && <ErrorState message={(me.error as Error).message} />}
        {me.data && <PrefForm initial={me.data} ownRow />}
      </section>

      <section className="px-4 mt-4">
        <SectionHeader title="Thành viên gia đình" />
        {fam.isLoading && <LoadingState />}
        {fam.error && <ErrorState message={(fam.error as Error).message} />}
        {fam.data && fam.data.members.length === 0 && (
          <RoundedCard className="text-xs text-muted-foreground">
            Chưa có thành viên khác.
          </RoundedCard>
        )}
        {fam.data && fam.data.members.length > 0 && (
          <div className="space-y-3">
            {fam.data.members.map((m) => (
              <RoundedCard key={m.user_id}>
                <p className="text-sm font-semibold mb-2">
                  {m.name ?? m.user_id.slice(0, 8)}
                  {me.data?.user_id === m.user_id && (
                    <span className="ml-2 text-[10px] text-muted-foreground">(bạn)</span>
                  )}
                </p>
                <ReadOnlyPrefs prefs={m.prefs} />
              </RoundedCard>
            ))}
            <p className="text-[11px] text-muted-foreground px-1">
              Mỗi người chỉ có thể chỉnh cài đặt của chính mình.
            </p>
          </div>
        )}
      </section>
    </MobileShell>
  );
}

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <RoundedCard>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-2xl bg-card border border-border grid place-items-center shrink-0">
          {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Giao diện tối (Dark Mode)</p>
          <p className="text-[11px] text-muted-foreground">
            Chuyển đổi giữa giao diện sáng và tối. Cài đặt được lưu cho lần sau.
          </p>
        </div>
        <Switch
          checked={isDark}
          onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
          aria-label="Bật chế độ tối"
        />
      </div>
    </RoundedCard>
  );
}

function EasyReadCard() {
  const { easyRead, setEasyRead } = useEasyRead();
  return (
    <RoundedCard>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-2xl bg-card border border-border grid place-items-center shrink-0">
          <Type className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Dễ đọc cho người lớn tuổi</p>
          <p className="text-[11px] text-muted-foreground">
            Tăng cỡ chữ, giãn dòng và phóng to vùng bấm để thao tác dễ dàng hơn.
          </p>
        </div>
        <Switch checked={easyRead} onCheckedChange={setEasyRead} aria-label="Bật chế độ dễ đọc" />
      </div>
    </RoundedCard>
  );
}

function PrefForm({ initial }: { initial: NotificationPrefs; ownRow?: boolean }) {
  const [med, setMed] = useState(initial.medicine_enabled);
  const [pr, setPr] = useState(initial.parent_reminder_enabled);
  const [qs, setQs] = useState(initial.quiet_start);
  const [qe, setQe] = useState(initial.quiet_end);

  useEffect(() => {
    setMed(initial.medicine_enabled);
    setPr(initial.parent_reminder_enabled);
    setQs(initial.quiet_start);
    setQe(initial.quiet_end);
  }, [initial]);

    const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      updateMyPrefs({
          medicine_enabled: med,
          parent_reminder_enabled: pr,
          quiet_start: qs,
          quiet_end: qe
    }),
    onSuccess: () => {
      toast.success("Đã lưu cài đặt");
      qc.invalidateQueries({ queryKey: ["np"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RoundedCard className="space-y-4">
      <Row
        icon={<Pill className="h-4 w-4 text-emergency" />}
        title="Nhắc uống thuốc"
        desc="Thông báo đúng giờ uống thuốc đã đặt."
        checked={med}
        onChange={setMed}
      />
      <Row
        icon={<Bell className="h-4 w-4 text-pink" />}
        title="Nhắc việc của con"
        desc="Thông báo khi đến hạn các việc đã đặt cho con."
        checked={pr}
        onChange={setPr}
      />

      <div className="pt-2 border-t border-border">
        <p className="text-xs font-semibold mb-2">Khung giờ được phép gửi</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] text-muted-foreground">Từ</label>
            <Input type="time" value={qs} onChange={(e) => setQs(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-muted-foreground">Đến</label>
            <Input type="time" value={qe} onChange={(e) => setQe(e.target.value)} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Ngoài khung giờ này hệ thống sẽ không tạo thông báo cho bạn (theo giờ Việt Nam).
        </p>
      </div>

      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {mut.isPending ? "Đang lưu..." : "Lưu cài đặt"}
      </Button>
    </RoundedCard>
  );
}

function Row({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-2xl bg-card border border-border grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ReadOnlyPrefs({ prefs }: { prefs: NotificationPrefs }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <Info label="Nhắc thuốc" value={prefs.medicine_enabled ? "Bật" : "Tắt"} />
      <Info label="Nhắc việc con" value={prefs.parent_reminder_enabled ? "Bật" : "Tắt"} />
      <Info label="Từ" value={prefs.quiet_start} />
      <Info label="Đến" value={prefs.quiet_end} />
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
