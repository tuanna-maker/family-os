import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Loader2, Shield } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { listFamilyMembers } from "@/lib/family-members.functions";
import {
  listPermissions,
  upsertPermission,
  type SharePermission,
} from "@/lib/expense-permissions.functions";

export const Route = createFileRoute("/chi-tieu_/chia-se")({
  head: () => ({ meta: [{ title: "Phân quyền chi tiêu — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: SharePage,
});

type PermKey = keyof Omit<SharePermission, "member_id">;
const PERMS: Array<{ key: PermKey; label: string; hint: string }> = [
  { key: "can_view", label: "Xem", hint: "Xem chi tiêu hộ gia đình" },
  { key: "can_create", label: "Thêm", hint: "Thêm khoản chi mới" },
  { key: "can_edit_all", label: "Sửa tất cả", hint: "Sửa chi tiêu của bất kỳ ai" },
  { key: "can_delete", label: "Xoá", hint: "Xoá chi tiêu" },
  { key: "can_manage_budget", label: "Ngân sách", hint: "Đặt và sửa ngân sách tháng" },
  { key: "can_manage_recurring", label: "Định kỳ", hint: "Quản lý quy tắc định kỳ" },
];

const OWNER_PERMS: SharePermission = {
  member_id: "",
  can_view: true,
  can_create: true,
  can_edit_all: true,
  can_delete: true,
  can_manage_budget: true,
  can_manage_recurring: true,
};

function SharePage() {
  const getCtx = useServerFn(getMyContext);
  const listMembers = useServerFn(listFamilyMembers);
  const listPerms = useServerFn(listPermissions);
  const upsert = useServerFn(upsertPermission);
  const qc = useQueryClient();

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const familyId = ctxQ.data?.family?.id;

  const membersQ = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listMembers({ data: { familyId: familyId! } }),
    enabled: !!familyId,
  });
  const permsQ = useQuery({
    queryKey: ["expense-perms", familyId],
    queryFn: () => listPerms({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });

  const permMap = useMemo(() => {
    const m = new Map<string, SharePermission>();
    for (const p of permsQ.data ?? []) m.set(p.member_id, p);
    return m;
  }, [permsQ.data]);

  const isOwner = membersQ.data?.isOwner ?? false;

  const saveM = useMutation({
    mutationFn: (p: SharePermission) =>
      upsert({ data: { family_id: familyId!, ...p } }),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ["expense-perms", familyId] });
      const prev = qc.getQueryData<SharePermission[]>(["expense-perms", familyId]);
      const next = (prev ?? []).filter((x) => x.member_id !== p.member_id).concat(p);
      qc.setQueryData(["expense-perms", familyId], next);
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["expense-perms", familyId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["expense-perms", familyId] }),
  });

  const toggle = (memberId: string, key: PermKey, value: boolean) => {
    const cur = permMap.get(memberId) ?? {
      member_id: memberId,
      can_view: true,
      can_create: true,
      can_edit_all: false,
      can_delete: false,
      can_manage_budget: false,
      can_manage_recurring: false,
    };
    saveM.mutate({ ...cur, [key]: value });
  };

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Chi tiêu"
        back="/chi-tieu"
        title="Phân quyền chi tiêu"
        subtitle="Kiểm soát ai được làm gì với chi tiêu hộ"
      />

      {!isOwner && (
        <section className="px-4">
          <RoundedCard className="flex items-center gap-3 bg-muted/40 border-dashed border-2 border-border">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Chỉ chủ hộ mới có thể chỉnh sửa phân quyền. Bạn đang xem ở chế độ chỉ đọc.
            </p>
          </RoundedCard>
        </section>
      )}

      <section className="px-4 mt-4 pb-24 space-y-3">
        {(membersQ.isLoading || permsQ.isLoading) && (
          <RoundedCard className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </RoundedCard>
        )}

        {(membersQ.data?.members ?? []).map((m) => {
          const perm = m.is_owner
            ? { ...OWNER_PERMS, member_id: m.user_id }
            : permMap.get(m.user_id) ?? {
                member_id: m.user_id,
                can_view: true,
                can_create: true,
                can_edit_all: false,
                can_delete: false,
                can_manage_budget: false,
                can_manage_recurring: false,
              };
          return (
            <RoundedCard key={m.user_id} className="p-4">
              <div className="flex items-center gap-3">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-2xl object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-muted grid place-items-center font-bold text-sm">
                    {(m.full_name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {m.full_name ?? m.email ?? "Thành viên"}
                    {m.is_self && <span className="ml-1 text-[10px] text-muted-foreground">(Bạn)</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.is_owner ? "Chủ hộ • Toàn quyền" : "Thành viên"}
                  </p>
                </div>
                {m.is_owner && <Shield className="h-4 w-4 text-brand" />}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {PERMS.map((p) => {
                  const checked = perm[p.key];
                  const disabled = m.is_owner || !isOwner;
                  return (
                    <label
                      key={p.key}
                      className={`flex items-start gap-2 p-2 rounded-xl border ${
                        checked ? "border-brand/40 bg-brand/5" : "border-border"
                      } ${disabled ? "opacity-60" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => toggle(m.user_id, p.key, e.target.checked)}
                        className="mt-0.5 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{p.hint}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RoundedCard>
          );
        })}
      </section>
    </MobileShell>
  );
}
