import { useState, useRef } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Heart, MessageCircle, Trash2, Loader2, Upload, X, Send } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  listMoments,
  createMoment,
  deleteMoment,
  toggleReaction,
  addComment,
  deleteComment,
  type Moment,
  type Reaction,
  type Comment,
} from "@/lib/moments.functions";
import { toast } from "sonner";

const REACTIONS = ["❤️", "😍", "😂", "👍", "🎉", "🥰"];

export const Route = createFileRoute("/khoanh-khac")({
  head: () => ({
    meta: [
      { title: "Khoảnh khắc gia đình — STOS Life" },
      { name: "description", content: "Album ảnh, video & kỷ niệm chung của cả gia đình" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: MomentsPage,
});

function MomentsPage() {
  const getCtx = useServerFn(getMyContext);
  const loadList = useServerFn(listMoments);
  const create = useServerFn(createMoment);
  const del = useServerFn(deleteMoment);
  const react = useServerFn(toggleReaction);
  const comment = useServerFn(addComment);
  const delCom = useServerFn(deleteComment);
  const qc = useQueryClient();

  const ctxQ = useQuery({ queryKey: ["my-ctx"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const userId = ctxQ.data?.userId ?? null;
  const familyId = ctxQ.data?.family?.id ?? null;

  const dataQ = useQuery({
    queryKey: ["moments", familyId],
    queryFn: () => loadList({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File quá lớn (>20MB)");
      return;
    }
    setPendingFile(f);
    setPreview(URL.createObjectURL(f));
    setShowUpload(true);
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!pendingFile || !familyId || !userId) throw new Error("Thiếu thông tin");
      setUploading(true);
      const ext = pendingFile.name.split(".").pop() || "jpg";
      const isVideo = pendingFile.type.startsWith("video/");
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("family-moments").upload(path, pendingFile, {
        contentType: pendingFile.type,
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("family-moments").getPublicUrl(path);
      return create({
        data: {
          family_id: familyId,
          media_url: pub.publicUrl,
          media_type: isVideo ? "video" : "image",
          caption: caption || undefined,
          tagged_member_ids: [],
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã đăng khoảnh khắc 🎉");
      setShowUpload(false);
      setCaption("");
      setPendingFile(null);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["moments"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá");
      qc.invalidateQueries({ queryKey: ["moments"] });
    },
  });

  const reactMut = useMutation({
    mutationFn: ({ moment_id, emoji }: { moment_id: string; emoji: string }) =>
      react({ data: { moment_id, family_id: familyId!, emoji } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moments"] }),
  });

  const moments = dataQ.data?.moments ?? [];
  const reactions = dataQ.data?.reactions ?? [];
  const comments = dataQ.data?.comments ?? [];

  return (
    <MobileShell>
      <PageHeader title="Khoảnh khắc gia đình" back="/" />

      <section className="px-4 mt-4">
        <RoundedCard className="bg-gradient-to-r from-brand/10 to-pink/10 border-brand/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center shrink-0">
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Lưu giữ kỷ niệm</p>
            <p className="text-[11px] text-muted-foreground">{moments.length} khoảnh khắc đã chia sẻ</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="h-9 px-3 rounded-2xl bg-brand text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Đăng mới
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </RoundedCard>
      </section>

      <section className="px-4 mt-5 pb-32 space-y-4">
        {dataQ.isLoading && (
          <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        )}
        {!dataQ.isLoading && moments.length === 0 && (
          <RoundedCard className="text-center py-10 text-sm text-muted-foreground">
            Chưa có khoảnh khắc nào. Hãy đăng ảnh/video đầu tiên của gia đình 🎈
          </RoundedCard>
        )}
        {moments.map((m) => (
          <MomentCard
            key={m.id}
            moment={m}
            reactions={reactions.filter((r) => r.moment_id === m.id)}
            comments={comments.filter((c) => c.moment_id === m.id)}
            currentUserId={userId}
            familyId={familyId}
            onReact={(emoji) => reactMut.mutate({ moment_id: m.id, emoji })}
            onDelete={() => {
              if (confirm("Xoá khoảnh khắc này?")) delMut.mutate(m.id);
            }}
            addComment={comment}
            deleteComment={delCom}
            onCommentChanged={() => qc.invalidateQueries({ queryKey: ["moments"] })}
          />
        ))}
      </section>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-end sm:place-items-center">
          <div className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-semibold">Đăng khoảnh khắc mới</p>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setPendingFile(null);
                  setPreview(null);
                }}
                className="h-8 w-8 rounded-full grid place-items-center hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {preview && pendingFile?.type.startsWith("video/") ? (
              <video src={preview} controls className="w-full rounded-2xl mb-3 max-h-72 bg-black" />
            ) : preview ? (
              <img src={preview} alt="preview" className="w-full rounded-2xl mb-3 max-h-72 object-cover" />
            ) : null}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Thêm chú thích…"
              rows={3}
              className="w-full rounded-2xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:border-brand"
            />
            <button
              onClick={() => submitMut.mutate()}
              disabled={uploading || !pendingFile}
              className="w-full mt-3 h-11 rounded-2xl bg-brand text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Đang đăng…" : "Đăng"}
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function MomentCard({
  moment,
  reactions,
  comments,
  currentUserId,
  familyId,
  onReact,
  onDelete,
  addComment,
  deleteComment,
  onCommentChanged,
}: {
  moment: Moment;
  reactions: Reaction[];
  comments: Comment[];
  currentUserId: string | null;
  familyId: string | null;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  addComment: ReturnType<typeof useServerFn<typeof import("@/lib/moments.functions").addComment>>;
  deleteComment: ReturnType<typeof useServerFn<typeof import("@/lib/moments.functions").deleteComment>>;
  onCommentChanged: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [body, setBody] = useState("");

  // group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    const g = acc[r.emoji] ?? { count: 0, mine: false };
    g.count += 1;
    if (r.user_id === currentUserId) g.mine = true;
    acc[r.emoji] = g;
    return acc;
  }, {});

  const submit = async () => {
    if (!body.trim() || !familyId) return;
    try {
      await addComment({ data: { moment_id: moment.id, family_id: familyId, body: body.trim() } });
      setBody("");
      onCommentChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <RoundedCard className="p-0 overflow-hidden">
      {moment.media_type === "video" ? (
        <video src={moment.media_url} controls className="w-full bg-black aspect-square object-cover" />
      ) : (
        <img src={moment.media_url} alt={moment.caption ?? "moment"} className="w-full bg-muted aspect-square object-cover" loading="lazy" />
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{new Date(moment.taken_at).toLocaleString("vi-VN")}</span>
          {moment.created_by === currentUserId && (
            <button onClick={onDelete} className="text-muted-foreground hover:text-emergency">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {moment.caption && <p className="text-sm">{moment.caption}</p>}

        {/* reactions row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(grouped).map(([emoji, g]) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className={`h-7 px-2 rounded-full text-xs flex items-center gap-1 border ${
                g.mine ? "bg-brand/15 border-brand text-brand" : "bg-muted border-border"
              }`}
            >
              <span>{emoji}</span>
              <span className="font-semibold">{g.count}</span>
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="h-7 w-7 rounded-full grid place-items-center bg-muted hover:bg-muted/70"
            >
              <Heart className="h-3.5 w-3.5" />
            </button>
            {showPicker && (
              <div className="absolute bottom-9 left-0 z-20 bg-background border border-border rounded-2xl shadow-lg p-1.5 flex gap-1">
                {REACTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      onReact(e);
                      setShowPicker(false);
                    }}
                    className="h-8 w-8 rounded-full hover:bg-muted text-lg"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowComments((v) => !v)}
            className="ml-auto h-7 px-2 rounded-full text-xs flex items-center gap-1 bg-muted"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {comments.length}
          </button>
        </div>

        {showComments && (
          <div className="pt-2 border-t border-border space-y-2">
            {comments.length === 0 && <p className="text-[11px] text-muted-foreground">Chưa có bình luận.</p>}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{c.body}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("vi-VN")}</p>
                </div>
                {c.user_id === currentUserId && (
                  <button
                    onClick={async () => {
                      await deleteComment({ data: { id: c.id } });
                      onCommentChanged();
                    }}
                    className="text-muted-foreground hover:text-emergency"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Viết bình luận…"
                className="flex-1 h-9 rounded-full border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
              <button
                onClick={submit}
                disabled={!body.trim()}
                className="h-9 w-9 rounded-full bg-brand text-white grid place-items-center disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </RoundedCard>
  );
}
