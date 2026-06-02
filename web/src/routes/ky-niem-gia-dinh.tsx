import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Heart, Sparkles, Upload, Calendar, Lock, ImagePlus, Loader2, Play } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { listMoments, createMoment, type Moment } from "@/lib/moments.functions";

export const Route = createFileRoute("/ky-niem-gia-dinh")({
  head: () => ({
    meta: [
      { title: "Kỷ niệm gia đình — STOS Life" },
      { name: "description", content: "Album ảnh, dấu mốc và những khoảnh khắc đáng nhớ của gia đình." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: MemoriesPage,
});

function formatVnDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}
function monthLabel(iso: string) {
  const d = new Date(iso);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

function MemoriesPage() {
  const getCtx = useServerFn(getMyContext);
  const loadList = useServerFn(listMoments);
  const create = useServerFn(createMoment);
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

  const moments: Moment[] = dataQ.data?.moments ?? [];
  const featured = moments[0] ?? null;
  const grid = moments.slice(0, 12);

  const grouped = useMemo(() => {
    const map = new Map<string, Moment[]>();
    for (const m of moments) {
      const key = monthLabel(m.taken_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [moments]);

  // Upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const submitMut = useMutation({
    mutationFn: async (file: File) => {
      if (!familyId || !userId) throw new Error("Chưa có gia đình");
      setUploading(true);
      const ext = file.name.split(".").pop() || "jpg";
      const isVideo = file.type.startsWith("video/");
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("family-moments").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("family-moments").getPublicUrl(path);
      return create({
        data: {
          family_id: familyId,
          media_url: pub.publicUrl,
          media_type: isVideo ? "video" : "image",
          tagged_member_ids: [],
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã thêm kỷ niệm 🎉");
      qc.invalidateQueries({ queryKey: ["moments"] });
      qc.invalidateQueries({ queryKey: ["moments-preview"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const onPick = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return toast.error("File quá lớn (>20MB)");
    submitMut.mutate(f);
  };

  const loading = ctxQ.isLoading || (familyId && dataQ.isLoading);
  const empty = !loading && moments.length === 0;

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Kỷ niệm gia đình"
        subtitle="Lưu lại từng khoảnh khắc đáng nhớ"
        emoji="📸"
        right={
          <button
            onClick={onPick}
            disabled={uploading || !familyId}
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center shadow-[var(--shadow-soft)] disabled:opacity-50"
            aria-label="Thêm kỷ niệm"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          </button>
        }
      />

      <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />

      {/* Privacy banner */}
      <section className="px-4 mt-2">
        <div className="flex items-center gap-2 rounded-2xl bg-tint-green/60 px-3 py-2 text-[11px] text-foreground/80">
          <Lock className="h-3.5 w-3.5 text-green-700" />
          <span>Riêng tư · Chỉ thành viên gia đình mới xem được</span>
        </div>
      </section>

      {/* Featured */}
      {featured ? (
        <section className="px-4 mt-3">
          <RoundedCard className="bg-gradient-to-br from-pink/15 to-brand/15 border-0 overflow-hidden p-0">
            <div className="relative aspect-[16/10] bg-muted">
              {featured.media_type === "video" ? (
                <video src={featured.media_url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={featured.media_url} alt={featured.caption ?? "Khoảnh khắc"} className="w-full h-full object-cover" loading="lazy" />
              )}
              {featured.media_type === "video" && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-12 w-12 rounded-full bg-black/50 grid place-items-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-pink">Khoảnh khắc mới nhất</p>
              <p className="mt-1 text-base font-bold leading-tight line-clamp-2">
                {featured.caption?.trim() || "Khoảnh khắc gia đình"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{formatVnDate(featured.taken_at)}</p>
              <div className="flex gap-2 mt-3">
                <Link
                  to="/khoanh-khac"
                  className="h-8 px-3 rounded-xl bg-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Heart className="h-3.5 w-3.5 text-pink" /> Mở album
                </Link>
              </div>
            </div>
          </RoundedCard>
        </section>
      ) : null}

      {/* Upload card */}
      <section className="px-4 mt-6">
        <button onClick={onPick} disabled={uploading || !familyId} className="w-full disabled:opacity-50">
          <RoundedCard className="border-2 border-dashed border-border bg-transparent">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-tint-blue grid place-items-center">
                {uploading ? <Loader2 className="h-5 w-5 text-brand animate-spin" /> : <Upload className="h-5 w-5 text-brand" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">{uploading ? "Đang tải lên…" : "Tải ảnh / video lên"}</p>
                <p className="text-[11px] text-muted-foreground">Tối đa 20MB · Chỉ gia đình xem được</p>
              </div>
            </div>
          </RoundedCard>
        </button>
      </section>

      {/* Empty / Loading */}
      {loading ? (
        <section className="px-4 mt-6">
          <RoundedCard className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </RoundedCard>
        </section>
      ) : empty ? (
        <section className="px-4 mt-6">
          <RoundedCard className="text-center py-8">
            <div className="h-14 w-14 rounded-2xl bg-tint-pink mx-auto grid place-items-center text-2xl">📷</div>
            <p className="mt-3 text-sm font-semibold">Chưa có kỷ niệm nào</p>
            <p className="text-[11px] text-muted-foreground mt-1">Tải ảnh đầu tiên để bắt đầu album gia đình.</p>
          </RoundedCard>
        </section>
      ) : null}

      {/* Recent grid */}
      {grid.length > 0 && (
        <section className="px-4 mt-6">
          <SectionHeader title="Gần đây" subtitle={`${moments.length} khoảnh khắc`} />
          <div className="grid grid-cols-3 gap-2">
            {grid.map((m) => (
              <Link
                key={m.id}
                to="/khoanh-khac"
                className="relative aspect-square rounded-2xl overflow-hidden bg-muted active:scale-[0.98] transition"
              >
                {m.media_type === "video" ? (
                  <>
                    <video src={m.media_url} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 grid place-items-center bg-black/20">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <img src={m.media_url} alt={m.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                )}
              </Link>
            ))}
            <button
              onClick={onPick}
              disabled={uploading || !familyId}
              className="aspect-square rounded-2xl border-2 border-dashed border-border grid place-items-center text-muted-foreground disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {/* Timeline by month */}
      {grouped.length > 0 && (
        <section className="px-4 mt-6">
          <SectionHeader title="Dòng thời gian" subtitle="Theo tháng" />
          <div className="space-y-5">
            {grouped.map(([month, entries]) => (
              <div key={month}>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">{month}</p>
                <RoundedCard className="p-0 divide-y divide-border">
                  {entries.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-start gap-3 p-3">
                      <div className="h-12 w-12 rounded-2xl bg-muted overflow-hidden shrink-0">
                        {t.media_type === "video" ? (
                          <video src={t.media_url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={t.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {t.caption?.trim() || (t.media_type === "video" ? "Video gia đình" : "Ảnh gia đình")}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatVnDate(t.taken_at)}</p>
                      </div>
                    </div>
                  ))}
                  {entries.length > 5 && (
                    <Link to="/khoanh-khac" className="block p-3 text-center text-xs font-semibold text-brand">
                      Xem thêm {entries.length - 5} khoảnh khắc →
                    </Link>
                  )}
                </RoundedCard>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Recap teaser — honest about coming-soon */}
      <section className="px-4 mt-6 mb-2">
        <RoundedCard className="bg-gradient-to-br from-purple/15 to-pink/10 border-0">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white grid place-items-center text-xl shrink-0">
              <Sparkles className="h-5 w-5 text-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-purple">AI Recap</p>
              <p className="text-sm font-semibold mt-0.5">Tóm tắt tháng tự động — sắp ra mắt</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                AI sẽ tự gợi ý album và ghép recap video từ kỷ niệm của bạn.
              </p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </RoundedCard>
      </section>
    </MobileShell>
  );
}
