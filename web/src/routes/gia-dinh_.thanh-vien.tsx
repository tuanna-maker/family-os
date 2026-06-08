import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Crown, UserPlus, LogOut, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { requireAuth } from "@/lib/require-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listFamilyMembers,
  updateMemberRole,
  removeMember,
  leaveFamily,
  type FamilyMemberRow,
} from "@/lib/family-members.functions";

export const Route = createFileRoute("/gia-dinh_/thanh-vien")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thành viên — Gia đình tôi" }] }),
  component: MembersPage,
});

function initials(name: string | null, email: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MembersPage() {
  const { familyId, isLoading: ctxLoading } = useFamilyContext();
  const qc = useQueryClient();
  const listFn = useServerFn(listFamilyMembers);
  const roleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);
  const leaveFn = useServerFn(leaveFamily);

  const q = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listFn({ data: { familyId: familyId! } }),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["family-members", familyId] });
  }

  async function handlePromote(m: FamilyMemberRow) {
    if (!familyId || !m.user_id) return;
    if (!confirm(`Nâng ${m.full_name ?? m.email ?? "thành viên"} thành chủ hộ phụ?`)) return;
    try {
      await roleFn({ data: { familyId, targetUserId: m.user_id, role: "family_owner" } });
      toast.success("Đã cập nhật vai trò");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDemote(m: FamilyMemberRow) {
    if (!familyId || !m.user_id) return;
    try {
      await roleFn({ data: { familyId, targetUserId: m.user_id, role: "family_member" } });
      toast.success("Đã cập nhật vai trò");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleRemove(m: FamilyMemberRow) {
    if (!familyId || !m.user_id) return;
    if (!confirm(`Gỡ ${m.full_name ?? m.email ?? "thành viên"} khỏi hộ?`)) return;
    try {
      await removeFn({ data: { familyId, targetUserId: m.user_id } });
      toast.success("Đã gỡ thành viên");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleLeave() {
    if (!familyId) return;
    if (!confirm("Bạn chắc chắn muốn rời khỏi hộ gia đình này?")) return;
    try {
      await leaveFn({ data: { familyId } });
      toast.success("Đã rời khỏi hộ");
      qc.invalidateQueries({ queryKey: ["my-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <MobileShell>
      <PageHeader
        title="Thành viên"
        subtitle={q.data?.family.name ?? undefined}
        eyebrow="Gia đình"
        back="/gia-dinh"
        emoji="👥"
      />

      {ctxLoading || q.isLoading ? (
        <div className="px-5 space-y-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : !familyId ? (
        <div className="px-5">
          <RoundedCard className="text-sm text-muted-foreground">
            Bạn chưa có hộ gia đình.{" "}
            <Link to="/gia-dinh/onboarding" className="text-brand font-semibold">
              Thiết lập ngay
            </Link>
          </RoundedCard>
        </div>
      ) : (
        <div className="px-5 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">
              {q.data?.members.length ?? 0} thành viên
            </p>
            <Link
              to="/gia-dinh/invites"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand"
            >
              <UserPlus className="h-4 w-4" />
              Mời thành viên
            </Link>
          </div>

          <ul className="space-y-2">
            {q.data?.members.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl bg-card border border-border p-3 flex items-start gap-3"
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-tint-blue text-brand grid place-items-center font-bold text-sm shrink-0">
                    {initials(m.full_name, m.email)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[14px] font-semibold truncate">
                      {m.full_name ?? m.username ?? m.email ?? "Người dùng"}
                    </p>
                    {m.is_self && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Bạn
                      </Badge>
                    )}
                    {m.is_owner && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-warning/15 text-warning border-warning/30">
                        <Crown className="h-3 w-3 mr-0.5" /> Chủ hộ
                      </Badge>
                    )}
                    {!m.is_owner && m.role === "family_owner" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Đồng chủ hộ
                      </Badge>
                    )}
                  </div>
                  {m.email && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {m.email}
                    </p>
                  )}
                </div>

                {q.data?.isOwner && !m.is_owner && m.user_id && (
                  <div className="flex flex-col gap-1 shrink-0">
                    {m.role === "family_member" ? (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handlePromote(m)}
                        aria-label="Nâng quyền"
                        title="Nâng thành đồng chủ hộ"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleDemote(m)}
                        aria-label="Hạ quyền"
                        title="Hạ về thành viên"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => handleRemove(m)}
                      aria-label="Gỡ thành viên"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Leave family */}
          {q.data && !q.data.isOwner && (
            <RoundedCard>
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/40"
                onClick={handleLeave}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Rời khỏi hộ gia đình
              </Button>
            </RoundedCard>
          )}
        </div>
      )}
    </MobileShell>
  );
}
