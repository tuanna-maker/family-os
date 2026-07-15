import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  addMomentComment,
  getMoment,
  toggleReaction,
  type MomentReaction,
} from "@/api/moments";
import { getMyContext } from "@/api/auth";
import { toast } from "sonner";

const REACTIONS = ["❤️", "👍", "🎉", "😂", "😮"] as const;

type Props = { momentId: string };

export function MomentDetailPage({ momentId }: Props) {
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getMyContext() });
  const myId = ctxQ.data?.userId;

  const q = useQuery({
    queryKey: ["family-moment", momentId, familyId],
    queryFn: () => getMoment({ moment_id: momentId, family_id: familyId! }),
    enabled: !!familyId && !!momentId,
  });

  const nameByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of q.data?.profiles ?? []) {
      m.set(p.id, p.full_name?.trim() || "Thành viên");
    }
    return m;
  }, [q.data?.profiles]);

  const reactionCounts = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of q.data?.reactions ?? []) {
      const cur = map.get(r.emoji) ?? { count: 0, mine: false };
      map.set(r.emoji, {
        count: cur.count + 1,
        mine: cur.mine || (myId != null && r.user_id === myId),
      });
    }
    return map;
  }, [q.data?.reactions, myId]);

  const reactMut = useMutation({
    mutationFn: (emoji: string) =>
      toggleReaction({ moment_id: momentId, family_id: familyId!, emoji }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-moment", momentId] });
      qc.invalidateQueries({ queryKey: ["family-moments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMut = useMutation({
    mutationFn: () =>
      addMomentComment({
        moment_id: momentId,
        family_id: familyId!,
        body: comment.trim(),
      }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["family-moment", momentId] });
      qc.invalidateQueries({ queryKey: ["family-moments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moment = q.data?.moment;
  const backTo = moment?.album_id
    ? `/ky-niem-gia-dinh/album/${moment.album_id}`
    : "/ky-niem-gia-dinh";

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Kỷ niệm"
        title={moment?.caption?.slice(0, 40) || "Chi tiết ảnh"}
        back={backTo}
        emoji="📷"
      />

      <section className="px-4 mt-2">
        {famLoading || q.isLoading ? (
          <LoadingState label="Đang tải…" />
        ) : q.isError || !moment ? (
          <EmptyState title="Không tìm thấy ảnh" />
        ) : (
          <div className="space-y-4 pb-24">
            <RoundedCard className="overflow-hidden p-0">
              <img
                src={moment.media_url}
                alt={moment.caption ?? "Kỷ niệm"}
                className="w-full max-h-[70vh] object-contain bg-black/5"
              />
            </RoundedCard>

            <p className="text-xs text-muted-foreground">
              {new Date(moment.taken_at).toLocaleString("vi-VN")} ·{" "}
              {nameByUser.get(moment.created_by) ?? "Thành viên"}
            </p>
            {moment.caption && <p className="text-sm font-medium">{moment.caption}</p>}

            <div className="flex flex-wrap gap-2">
              {REACTIONS.map((emoji) => {
                const info = reactionCounts.get(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={reactMut.isPending}
                    onClick={() => reactMut.mutate(emoji)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      info?.mine ? "bg-brand/15 border-brand" : "bg-card border-border"
                    }`}
                  >
                    {emoji}
                    {info && info.count > 0 ? (
                      <span className="ml-1 text-xs font-semibold tabular-nums">{info.count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <ReactionList
              reactions={q.data?.reactions ?? []}
              nameByUser={nameByUser}
            />

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Bình luận ({q.data?.comments.length ?? 0})
              </p>
              <div className="space-y-2">
                {(q.data?.comments ?? []).map((c) => (
                  <RoundedCard key={c.id} className="p-3">
                    <p className="text-xs font-semibold">{nameByUser.get(c.user_id) ?? "Thành viên"}</p>
                    <p className="text-sm mt-1">{c.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleString("vi-VN")}
                    </p>
                  </RoundedCard>
                ))}
                {(q.data?.comments ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có bình luận — hãy là người đầu tiên.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {moment && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur max-w-lg mx-auto">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              commentMut.mutate();
            }}
          >
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Viết bình luận…"
              className="flex-1 h-11"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl bg-brand"
              disabled={!comment.trim() || commentMut.isPending}
            >
              {commentMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </MobileShell>
  );
}

function ReactionList({
  reactions,
  nameByUser,
}: {
  reactions: MomentReaction[];
  nameByUser: Map<string, string>;
}) {
  if (reactions.length === 0) return null;
  const grouped = new Map<string, string[]>();
  for (const r of reactions) {
    const list = grouped.get(r.emoji) ?? [];
    list.push(nameByUser.get(r.user_id) ?? "Thành viên");
    grouped.set(r.emoji, list);
  }
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      {Array.from(grouped.entries()).map(([emoji, names]) => (
        <p key={emoji}>
          {emoji} {names.join(", ")}
        </p>
      ))}
    </div>
  );
}
