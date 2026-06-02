import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Globe,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  LayoutDashboard,
  Camera,
  Loader2,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/tai-khoan")({
  head: () => ({ meta: [{ title: "Tài khoản — STOS Life" }] }),
  component: AccountPage,
});

type SettingItem = {
  icon: LucideIcon;
  label: string;
  to?: "/admin" | "/cai-dat/thong-bao" | "/lien-he";
  value?: string;
  comingSoon?: boolean;
};

const SETTINGS: SettingItem[] = [
  { icon: Bell, label: "Thông báo", to: "/cai-dat/thong-bao" },
  { icon: Lock, label: "Bảo mật & quyền riêng tư", comingSoon: true },
  { icon: Moon, label: "Giao diện", comingSoon: true },
  { icon: Globe, label: "Ngôn ngữ", value: "Tiếng Việt", comingSoon: true },
  { icon: LayoutDashboard, label: "Bảng quản trị (Admin)", to: "/admin" },
  { icon: HelpCircle, label: "Hỗ trợ", to: "/lien-he" },
];

function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Cần đăng nhập");
      if (!file.type.startsWith("image/")) throw new Error("Chỉ chấp nhận ảnh");
      if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5MB");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      return url;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật ảnh đại diện");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error("Tải ảnh thất bại", { description: e.message }),
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate({ to: "/login" });
    } catch (e) {
      toast.error("Đăng xuất thất bại", { description: (e as Error).message });
    }
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

  return (
    <MobileShell>
      <PageHeader title="Tài khoản" back={false} />

      <section className="px-4">
        <RoundedCard className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadMut.isPending}
            aria-label="Đổi ảnh đại diện"
            className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-brand to-pink grid place-items-center text-2xl font-semibold text-white shrink-0 overflow-hidden group"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
            <span className="absolute inset-0 bg-black/40 grid place-items-center opacity-0 group-active:opacity-100 transition">
              {uploadMut.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </span>
            {uploadMut.isPending && (
              <span className="absolute inset-0 bg-black/40 grid place-items-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMut.mutate(f);
              e.target.value = "";
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{displayName}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending}
              className="text-[11px] text-brand font-medium mt-1 active:opacity-70"
            >
              {uploadMut.isPending ? "Đang tải..." : "Đổi ảnh đại diện"}
            </button>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <RoundedCard className="p-0 divide-y divide-border">
          {SETTINGS.map(({ icon: Icon, label, value, to, comingSoon }) => {
            const content = (
              <div className="w-full flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-2xl bg-muted grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium truncate">{label}</span>
                {value && <span className="text-xs text-muted-foreground shrink-0">{value}</span>}
                {comingSoon && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    Sắp ra mắt
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
            if (to) {
              return (
                <Link key={label} to={to} className="block active:bg-muted/40">
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={label}
                onClick={() => toast.info(`${label} — sẽ có trong bản cập nhật tới`)}
                className="w-full text-left active:bg-muted/40"
              >
                {content}
              </button>
            );
          })}
        </RoundedCard>

        <button
          onClick={() => setConfirmOpen(true)}
          className="mt-4 w-full rounded-2xl bg-card border border-border p-4 flex items-center justify-center gap-2 text-sm font-semibold text-emergency active:bg-muted/40"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-4">STOS Life v1.0</p>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất khỏi STOS Life?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ cần đăng nhập lại để nhận thông báo SOS, lịch và các cập nhật từ toà nhà.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Đăng xuất</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileShell>
  );
}
