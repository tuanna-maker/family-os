import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Check, Sparkles, Camera, BarChart3, Zap, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  getEntitlement,
  activatePremiumTrial,
  requestPremiumUpgrade,
  listMyUpgradeRequests,
} from "@/lib/expense-premium.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/chi-tieu_/premium")({
  head: () => ({ meta: [{ title: "Nâng cấp Premium — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: PremiumPage,
});

const FEATURES = [
  { icon: Camera, title: "OCR 50 hoá đơn / tháng", desc: "Quét hoá đơn tự động bằng AI" },
  { icon: Sparkles, title: "AI Insights hàng tuần", desc: "Phân tích xu hướng, gợi ý tiết kiệm" },
  { icon: BarChart3, title: "Báo cáo nâng cao", desc: "So sánh theo quý, năm; xuất Excel" },
  { icon: Zap, title: "Cảnh báo bất thường", desc: "Phát hiện chi tiêu vượt mức tự động" },
];

function PremiumPage() {
  const getCtx = useServerFn(getMyContext);
  const loadEnt = useServerFn(getEntitlement);
  const activate = useServerFn(activatePremiumTrial);
  const requestUp = useServerFn(requestPremiumUpgrade);
  const listReq = useServerFn(listMyUpgradeRequests);
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx() });
  const familyId = ctxQ.data?.family?.id;
  const isOwner = !!ctxQ.data && ctxQ.data.family?.owner_id === ctxQ.data.userId;

  const entQ = useQuery({
    queryKey: ["entitlement", familyId],
    queryFn: () => loadEnt({ data: { familyId: familyId! } }),
    enabled: !!familyId,
  });

  const reqQ = useQuery({
    queryKey: ["upgrade-reqs", familyId],
    queryFn: () => listReq({ data: { familyId: familyId! } }),
    enabled: !!familyId,
  });

  const trialM = useMutation({
    mutationFn: () => activate({ data: { familyId: familyId! } }),
    onSuccess: () => {
      toast.success("Đã kích hoạt thử 14 ngày Premium!");
      qc.invalidateQueries({ queryKey: ["entitlement", familyId] });
      qc.invalidateQueries({ queryKey: ["upgrade-reqs", familyId] });
      qc.invalidateQueries({ queryKey: ["ocr-ent", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reqM = useMutation({
    mutationFn: () => requestUp({ data: { familyId: familyId!, note: note || undefined } }),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu nâng cấp — đội ngũ sẽ liên hệ sớm");
      setNote("");
      qc.invalidateQueries({ queryKey: ["upgrade-reqs", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ent = entQ.data;
  const isPremium = ent?.plan === "premium";
  const expiresAt = ent?.expiresAt ? new Date(ent.expiresAt) : null;
  const hasPending = reqQ.data?.requests.some((r) => r.status === "pending");
  const trialUsed = reqQ.data?.requests.some((r) => r.status === "trial_used");

  return (
    <MobileShell>
      <PageHeader title="STOS Premium" back="/chi-tieu" />

      <section className="px-4 mt-4">
        <RoundedCard className="border-0 bg-gradient-to-br from-amber-400 via-pink-400 to-purple-500 text-white">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">
              <Crown className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider opacity-80">Gói hiện tại</p>
              <p className="text-2xl font-bold">
                {isPremium ? "Premium" : "Free"}
              </p>
              {isPremium && expiresAt && (
                <p className="text-xs opacity-90 mt-0.5">
                  Hết hạn: {expiresAt.toLocaleDateString("vi-VN")}
                </p>
              )}
              {!isPremium && (
                <p className="text-xs opacity-90 mt-0.5">
                  5 lượt OCR/tháng · Không có AI Insights
                </p>
              )}
            </div>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <SectionHeader title="Premium gồm những gì" />
        <RoundedCard className="space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  {f.title}
                </p>
                <p className="text-xs text-foreground/60 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </RoundedCard>
      </section>

      {!isPremium && isOwner && (
        <section className="px-4 mt-5 space-y-3">
          {!trialUsed && (
            <button
              onClick={() => trialM.mutate()}
              disabled={trialM.isPending || !familyId}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-pink-500 text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
            >
              {trialM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Dùng thử miễn phí 14 ngày
            </button>
          )}

          <RoundedCard>
            <p className="text-xs font-semibold mb-2">Yêu cầu nâng cấp dài hạn</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (tùy chọn): số căn hộ, nhu cầu cụ thể…"
              rows={2}
              className="w-full text-xs rounded-xl border border-border bg-background p-2 resize-none"
            />
            <button
              onClick={() => reqM.mutate()}
              disabled={reqM.isPending || hasPending || !familyId}
              className="mt-2 w-full rounded-xl bg-foreground text-background py-2.5 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {reqM.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {hasPending ? "Đang chờ duyệt" : "Gửi yêu cầu"}
            </button>
          </RoundedCard>
        </section>
      )}

      {!isOwner && !isPremium && (
        <section className="px-4 mt-5">
          <RoundedCard>
            <p className="text-xs text-foreground/60 text-center py-2">
              Chỉ chủ gia đình mới có thể nâng cấp gói.
            </p>
          </RoundedCard>
        </section>
      )}

      {(reqQ.data?.requests.length ?? 0) > 0 && (
        <section className="px-4 mt-5">
          <SectionHeader title="Lịch sử yêu cầu" />
          <RoundedCard className="space-y-2">
            {reqQ.data!.requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <p className="font-medium">{r.plan === "premium" ? "Premium" : r.plan}</p>
                  <p className="text-foreground/50 text-[11px]">
                    {new Date(r.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    r.status === "approved" || r.status === "trial_used"
                      ? "bg-green-100 text-green-700"
                      : r.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.status === "pending" ? "Chờ duyệt" :
                   r.status === "approved" ? "Đã duyệt" :
                   r.status === "rejected" ? "Từ chối" :
                   r.status === "trial_used" ? "Đã dùng thử" : r.status}
                </span>
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      <div className="h-8" />
    </MobileShell>
  );
}
