import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Trash2, Mail, Phone, UserPlus, HardDrive, Users } from "lucide-react";
import { requireAuth } from "@/lib/require-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  createInvite,
  listInvites,
  revokeInvite,
  getQuota,
} from "@/lib/household-invite.functions";

export const Route = createFileRoute("/gia-dinh_/invites")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Mời thành viên — Gia đình tôi" }] }),
  component: InvitesPage,
});

function InvitesPage() {
  const { familyId, family, isLoading: ctxLoading } = useFamilyContext();
  const qc = useQueryClient();

  const fnList = useServerFn(listInvites);
  const fnQuota = useServerFn(getQuota);
  const fnCreate = useServerFn(createInvite);
  const fnRevoke = useServerFn(revokeInvite);

  const invitesQ = useQuery({
    queryKey: ["invites", familyId],
    queryFn: () => fnList({ data: { householdId: familyId! } }),
    enabled: !!familyId,
  });
  const quotaQ = useQuery({
    queryKey: ["quota", familyId],
    queryFn: () => fnQuota({ data: { householdId: familyId! } }),
    enabled: !!familyId,
  });

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const createM = useMutation({
    mutationFn: () =>
      fnCreate({
        data: {
          householdId: familyId!,
          role: "family_member",
          invitedEmail: email.trim() || undefined,
          invitedPhone: phone.trim() || undefined,
          expiresInDays: 7,
        },
      }),
    onSuccess: (res) => {
      toast.success("Đã tạo lời mời");
      navigator.clipboard?.writeText(res.webUrl ?? res.deepLink).catch(() => {});
      setEmail("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["invites", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeM = useMutation({
    mutationFn: (inviteId: string) => fnRevoke({ data: { inviteId } }),
    onSuccess: () => {
      toast.success("Đã huỷ lời mời");
      qc.invalidateQueries({ queryKey: ["invites", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (ctxLoading) {
    return (
      <MobileShell>
        <PageHeader title="Mời thành viên" eyebrow="Family Core" back="/gia-dinh" />
        <div className="px-5 space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </MobileShell>
    );
  }

  if (!familyId) {
    return (
      <MobileShell>
        <PageHeader title="Mời thành viên" eyebrow="Family Core" back="/gia-dinh" />
        <div className="px-5">
          <RoundedCard>
            <p className="text-sm">Bạn chưa thuộc hộ gia đình nào.</p>
          </RoundedCard>
        </div>
      </MobileShell>
    );
  }

  const quota = quotaQ.data;
  const storagePct = quota
    ? Math.round((quota.storage_used_bytes / Math.max(1, quota.storage_limit_bytes)) * 100)
    : 0;

  return (
    <MobileShell>
      <PageHeader
        title="Mời thành viên"
        subtitle={family?.name ?? undefined}
        eyebrow="Family Core"
        back="/gia-dinh"
      />

      <div className="px-5 space-y-5 pb-10">
        {/* Quota */}
        <RoundedCard>
          <SectionHeader title="Hạn mức hộ gia đình" />
          {quotaQ.isLoading ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : quota ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Thành viên
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {quota.members_count}/{quota.members_limit}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <HardDrive className="h-3.5 w-3.5" /> Lưu trữ
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums">{storagePct}%</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu hạn mức.</p>
          )}
        </RoundedCard>

        {/* Create invite */}
        <RoundedCard>
          <SectionHeader title="Tạo lời mời mới" subtitle="Hết hạn sau 7 ngày" />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email" className="text-xs">
                Email (tuỳ chọn)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="nguoi-than@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-phone" className="text-xs">
                Số điện thoại (tuỳ chọn)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inv-phone"
                  type="tel"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => createM.mutate()}
              disabled={createM.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {createM.isPending ? "Đang tạo…" : "Tạo lời mời & sao chép liên kết"}
            </Button>
          </div>
        </RoundedCard>

        {/* List */}
        <div>
          <SectionHeader title="Lời mời đã tạo" />
          {invitesQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : (invitesQ.data?.length ?? 0) === 0 ? (
            <RoundedCard>
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có lời mời nào.
              </p>
            </RoundedCard>
          ) : (
            <div className="space-y-2">
              {invitesQ.data!.map((inv) => {
                const expired = new Date(inv.expires_at).getTime() < Date.now();
                const status = inv.revoked_at
                  ? { label: "Đã huỷ", variant: "secondary" as const }
                  : inv.accepted_at
                    ? { label: "Đã chấp nhận", variant: "default" as const }
                    : expired
                      ? { label: "Hết hạn", variant: "destructive" as const }
                      : { label: "Đang chờ", variant: "outline" as const };
                const link =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/gia-dinh/invite/${inv.token}`
                    : `/gia-dinh/invite/${inv.token}`;
                const isActive =
                  !inv.revoked_at && !inv.accepted_at && !expired;
                return (
                  <RoundedCard key={inv.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <span className="text-[11px] text-muted-foreground">
                            HH {new Date(inv.expires_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="text-sm mt-2 truncate">
                          {inv.invited_email ?? inv.invited_phone ?? "Không xác định"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate mt-1">
                          {inv.token.slice(0, 16)}…
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard?.writeText(link);
                            toast.success("Đã sao chép liên kết");
                          }}
                          aria-label="Sao chép"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {isActive && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => revokeM.mutate(inv.id)}
                            disabled={revokeM.isPending}
                            aria-label="Huỷ"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </RoundedCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
