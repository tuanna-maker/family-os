import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Heart, Sparkles, Upload, Calendar, Lock, ImagePlus } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { toast } from "sonner";
import {
  albums,
  milestones,
  timeline,
  aiSuggestions,
  albumCategories,
  type AlbumCategory,
} from "@/features/family-core/memories";

export const Route = createFileRoute("/ky-niem-gia-dinh")({
  head: () => ({
    meta: [
      { title: "Kỷ niệm gia đình — STOS Life" },
      { name: "description", content: "Album ảnh, dấu mốc và những khoảnh khắc đáng nhớ của gia đình." },
    ],
  }),
  component: MemoriesPage,
});

const toneBg: Record<string, string> = {
  blue: "bg-tint-blue",
  pink: "bg-tint-pink",
  green: "bg-tint-green",
  orange: "bg-tint-orange",
  purple: "bg-tint-purple",
};

function MemoriesPage() {
  const [activeCat, setActiveCat] = useState<AlbumCategory | "Tất cả">("Tất cả");

  const filteredAlbums = useMemo(
    () => (activeCat === "Tất cả" ? albums : albums.filter((a) => a.category === activeCat)),
    [activeCat]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof timeline>();
    for (const t of timeline) {
      if (!map.has(t.monthLabel)) map.set(t.monthLabel, []);
      map.get(t.monthLabel)!.push(t);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Kỷ niệm gia đình"
        subtitle="Lưu lại từng khoảnh khắc đáng nhớ"
        emoji="📸"
        right={
          <button
            onClick={() => toast("Thêm kỷ niệm mới", { description: "Tính năng sẽ sớm có mặt." })}
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center shadow-[var(--shadow-soft)]"
            aria-label="Thêm kỷ niệm"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      {/* Privacy banner */}
      <section className="px-4 mt-2">
        <div className="flex items-center gap-2 rounded-2xl bg-tint-green/60 px-3 py-2 text-[11px] text-foreground/80">
          <Lock className="h-3.5 w-3.5 text-green-700" />
          <span>Riêng tư · Chỉ thành viên gia đình mới xem được</span>
        </div>
      </section>

      {/* Featured */}
      <section className="px-4 mt-3">
        <RoundedCard className="bg-gradient-to-br from-pink/15 to-brand/15 border-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-pink">Khoảnh khắc gần nhất</p>
          <p className="mt-1 text-lg font-bold leading-tight">Sinh nhật bé Na 5 tuổi 🎂</p>
          <p className="text-xs text-muted-foreground mt-1">42 ảnh · 23/05/2026</p>
          <div className="flex gap-2 mt-3">
            <button className="h-8 px-3 rounded-xl bg-white text-xs font-semibold flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink" /> Yêu thích
            </button>
            <button
              onClick={() => toast("Xem album")}
              className="h-8 px-3 rounded-xl bg-white text-xs font-semibold"
            >
              Xem album
            </button>
          </div>
        </RoundedCard>
      </section>

      {/* AI Suggestions */}
      <section className="px-4 mt-6">
        <SectionHeader title="Gợi ý từ AI" subtitle="Dựa trên ảnh gần đây" />
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x">
          {aiSuggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => toast(s.title, { description: s.hint })}
              className="snap-start min-w-[78%] text-left"
            >
              <RoundedCard className="bg-gradient-to-br from-brand/10 to-purple/15 border-0 h-full">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white grid place-items-center text-xl shrink-0">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand" />
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-brand">AI Memory</p>
                    </div>
                    <p className="text-sm font-semibold mt-1 leading-snug">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{s.hint}</p>
                  </div>
                </div>
              </RoundedCard>
            </button>
          ))}
        </div>
      </section>

      {/* Upload placeholder */}
      <section className="px-4 mt-6">
        <button
          onClick={() => toast("Tải ảnh lên", { description: "Tính năng đang chuẩn bị." })}
          className="w-full"
        >
          <RoundedCard className="border-2 border-dashed border-border bg-transparent">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-tint-blue grid place-items-center">
                <Upload className="h-5 w-5 text-brand" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Tải ảnh lên</p>
                <p className="text-[11px] text-muted-foreground">Kéo thả hoặc chọn từ thư viện</p>
              </div>
            </div>
          </RoundedCard>
        </button>
      </section>

      {/* Categories filter */}
      <section className="px-4 mt-6">
        <SectionHeader title="Danh mục" />
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {(["Tất cả", ...albumCategories.map((c) => c.key)] as const).map((cat) => {
            const active = activeCat === cat;
            const emoji = cat === "Tất cả" ? "🗂️" : albumCategories.find((c) => c.key === cat)?.emoji;
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat as AlbumCategory | "Tất cả")}
                className={`shrink-0 h-9 px-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  active ? "bg-foreground text-background" : "bg-card border border-border text-foreground"
                }`}
              >
                <span>{emoji}</span>
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Albums grid */}
      <section className="px-4 mt-4">
        <SectionHeader title="Album" subtitle={`${filteredAlbums.length} album`} />
        <div className="grid grid-cols-2 gap-3">
          {filteredAlbums.map((a) => (
            <button key={a.id} className="text-left active:scale-[0.98] transition">
              <div className={`relative aspect-square rounded-2xl grid place-items-center text-5xl ${toneBg[a.tone]}`}>
                {a.cover}
                <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 backdrop-blur">
                  {a.category}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold truncate">{a.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {a.count} ảnh · {a.date}
              </p>
            </button>
          ))}
          {/* Add album tile */}
          <button
            onClick={() => toast("Tạo album mới")}
            className="text-left active:scale-[0.98] transition"
          >
            <div className="aspect-square rounded-2xl border-2 border-dashed border-border grid place-items-center text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] font-semibold">Album mới</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Monthly recap placeholder */}
      <section className="px-4 mt-6">
        <RoundedCard className="bg-gradient-to-br from-purple/15 to-pink/10 border-0">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white grid place-items-center text-xl shrink-0">
              <Calendar className="h-5 w-5 text-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-purple">Recap tháng</p>
              <p className="text-sm font-semibold mt-0.5">Tháng 5/2026 — sắp sẵn sàng</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                AI sẽ tự ghép video kỷ niệm tháng vào ngày cuối tháng.
              </p>
              <button
                onClick={() => toast("Recap sẽ sẵn sàng vào 31/05")}
                className="mt-3 h-8 px-3 rounded-xl bg-white text-xs font-semibold"
              >
                Đặt lịch nhắc
              </button>
            </div>
          </div>
        </RoundedCard>
      </section>

      {/* Family Timeline */}
      <section className="px-4 mt-6">
        <SectionHeader title="Dòng thời gian" subtitle="Theo tháng" />
        <div className="space-y-5">
          {grouped.map(([month, entries]) => (
            <div key={month}>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                {month}
              </p>
              <RoundedCard className="p-0 divide-y divide-border">
                {entries.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 p-4">
                    <div className={`h-11 w-11 rounded-2xl ${toneBg[t.tone]} grid place-items-center text-xl shrink-0`}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{t.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.date}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {t.description}
                      </p>
                      {t.photoCount ? (
                        <p className="text-[10px] text-brand font-semibold mt-1">{t.photoCount} ảnh</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </RoundedCard>
            </div>
          ))}
        </div>
      </section>

      {/* Milestones */}
      <section className="px-4 mt-6">
        <SectionHeader title="Dấu mốc gia đình" />
        <RoundedCard className="p-0 divide-y divide-border">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-start gap-3 p-4">
              <div className="h-11 w-11 rounded-2xl bg-tint-pink grid place-items-center text-xl shrink-0">
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{m.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m.date}</p>
              </div>
            </div>
          ))}
        </RoundedCard>
      </section>
    </MobileShell>
  );
}
