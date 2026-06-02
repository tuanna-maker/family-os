import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Home, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInvitePreview, acceptInvite } from "@/lib/household-invite.functions";

export const Route = createFileRoute("/gia-dinh_/invite/$token")({
  head: () => ({ meta: [{ title: "Lời mời tham gia hộ gia đình" }] }),
  component: InviteAcceptPage,
});

function InviteAcceptPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fnPreview = useServerFn(getInvitePreview);
  const fnAccept = useServerFn(acceptInvite);

  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setHasSession(!!s),
    );
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const previewQ = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => fnPreview({ data: { token } }),
  });

  const acceptM = useMutation({
    mutationFn: () => fnAccept({ data: { token } }),
    onSuccess: () => {
      toast.success("Đã tham gia hộ gia đình");
      navigate({ to: "/gia-dinh" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader title="Lời mời tham gia" subtitle="Hộ gia đình" />
      <div className="px-4 pb-24 space-y-4">
        {previewQ.isLoading ? (
          <RoundedCard>
            <Skeleton className="h-6 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </RoundedCard>
        ) : previewQ.isError ? (
          <StatusCard
            icon={<XCircle className="size-10 text-destructive" />}
            title="Không tải được lời mời"
            desc={(previewQ.error as Error)?.message ?? "Vui lòng thử lại"}
          />
        ) : (
          renderByStatus(
            previewQ.data!,
            token,
            hasSession,
            acceptM.isPending,
            () => acceptM.mutate(),
          )
        )}
      </div>
    </MobileShell>
  );
}

function renderByStatus(
  data: Awaited<ReturnType<typeof getInvitePreview>>,
  token: string,
  hasSession: boolean | null,
  accepting: boolean,
  onAccept: () => void,
) {
  if (data.status === "not_found")
    return (
      <StatusCard
        icon={<XCircle className="size-10 text-destructive" />}
        title="Lời mời không tồn tại"
        desc="Đường dẫn có thể đã bị thay đổi hoặc xoá."
      />
    );
  if (data.status === "revoked")
    return (
      <StatusCard
        icon={<XCircle className="size-10 text-destructive" />}
        title="Lời mời đã bị huỷ"
        desc="Chủ hộ đã thu hồi lời mời này."
      />
    );
  if (data.status === "accepted")
    return (
      <StatusCard
        icon={<CheckCircle2 className="size-10 text-emerald-600" />}
        title="Lời mời đã được dùng"
        desc="Lời mời này đã được chấp nhận trước đó."
      />
    );
  if (data.status === "expired")
    return (
      <StatusCard
        icon={<Clock className="size-10 text-amber-600" />}
        title="Lời mời đã hết hạn"
        desc="Vui lòng yêu cầu chủ hộ gửi lại lời mời mới."
      />
    );

  // valid
  return (
    <>
      <RoundedCard>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Home className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Bạn được mời vào</div>
            <div className="text-lg font-semibold">{data.household.name}</div>
            {data.household.apartment && (
              <div className="text-sm text-muted-foreground">
                Căn hộ {data.household.apartment}
              </div>
            )}
            <Badge variant="secondary" className="mt-2">
              Vai trò: {data.role === "family_owner" ? "Chủ hộ" : "Thành viên"}
            </Badge>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Hết hạn: {new Date(data.expiresAt).toLocaleString("vi-VN")}
        </div>
      </RoundedCard>

      {hasSession === null ? (
        <Skeleton className="h-11 w-full rounded-xl" />
      ) : hasSession ? (
        <Button
          className="w-full h-12 rounded-xl"
          onClick={onAccept}
          disabled={accepting}
        >
          {accepting ? "Đang xử lý..." : "Chấp nhận lời mời"}
        </Button>
      ) : (
        <RoundedCard>
          <div className="flex items-center gap-2 text-sm text-amber-700 mb-3">
            <AlertTriangle className="size-4" />
            Bạn cần đăng nhập để chấp nhận lời mời này.
          </div>
          <Link
            to="/login"
            search={{ redirect: `/gia-dinh/invite/${token}` }}
            className="block"
          >
            <Button className="w-full h-12 rounded-xl">Đăng nhập để tiếp tục</Button>
          </Link>
        </RoundedCard>
      )}
    </>
  );
}

function StatusCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <RoundedCard>
      <div className="flex flex-col items-center text-center py-6">
        {icon}
        <div className="mt-3 font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </div>
    </RoundedCard>
  );
}
