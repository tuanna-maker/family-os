import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/mobile/MobileShell";
import {
  Bell,
  ChevronRight,
  ChevronDown,
  Users,
  Calendar,
  Bookmark,
  Settings,
  Wallet,
  ShoppingBasket,
  HeartPulse,
  Plane,
  Home,
  Car,
  ShoppingCart,
  Crown,
  TrendingDown,
  TrendingUp,
  Pill,
  Stethoscope,
  Camera,
  Ticket,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyContext, updateFamilyAvatar } from "@/lib/auth.functions";
import { getDashboard } from "@/lib/dashboard.functions";
import { listMoments } from "@/lib/moments.functions";
import { requireAuth } from "@/lib/require-auth";
import { materializeEventReminders } from "@/lib/family-events.functions";
import { SosButton } from "@/components/sos/SosButton";

// Cache constants — context hiếm khi đổi, dashboard refresh nhanh hơn
const CTX_STALE_MS = 5 * 60_000;
const DASH_STALE_MS = 60_000;

export const Route = createFileRoute("/gia-dinh")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [
      { title: "Gia đình tôi — STOS Life" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#2563eb" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Gia đình" },
    ],
    links: [
      { rel: "manifest", href: "/manifest-family.json" },
      { rel: "apple-touch-icon", href: "/icons/family-192.png" },
    ],
  }),
  component: FamilyPage,
});


import stosLogo from "@/assets/stos-logo.webp";
const HERO_FAMILY_FALLBACK = stosLogo;

const FOOD_THUMBS = [
  "https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=80&h=80&fit=crop&q=70&auto=format",
  "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop&q=70&auto=format",
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=80&h=80&fit=crop&q=70&auto=format",
];




function formatVnd(n: number) {
  return `${(n ?? 0).toLocaleString("vi-VN")}đ`;
}
function currentMonthLabel() {
  return `Tổng chi tháng ${new Date().getMonth() + 1}`;
}
function ageFromDob(dob: string | null): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
  return `(${years} tuổi)`;
}
function formatApptDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hhmm = d.toTimeString().slice(0, 5);
  if (sameDay) return `${hhmm} hôm nay`;
  return `${hhmm} · ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIN_BYTES = 1024;
const AVATAR_MIME_WHITELIST = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] as const;
const AVATAR_EXT_WHITELIST = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"] as const;
const AVATAR_ACCEPT = AVATAR_MIME_WHITELIST.join(",");

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function validateAvatarFile(file: File): { ok: true } | { ok: false; title: string; description: string } {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const mimeOk = AVATAR_MIME_WHITELIST.includes(file.type as (typeof AVATAR_MIME_WHITELIST)[number]);
  const extOk = AVATAR_EXT_WHITELIST.includes(ext as (typeof AVATAR_EXT_WHITELIST)[number]);
  if (!mimeOk || !extOk) {
    return {
      ok: false,
      title: "Định dạng ảnh không hỗ trợ",
      description: `Chỉ chấp nhận JPG, PNG, WEBP, GIF hoặc HEIC. Tệp bạn chọn: ${file.type || ext || "không xác định"}.`,
    };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      title: "Ảnh quá lớn",
      description: `Dung lượng ${formatBytes(file.size)} vượt giới hạn 5 MB. Vui lòng nén hoặc chọn ảnh khác.`,
    };
  }
  if (file.size < AVATAR_MIN_BYTES) {
    return {
      ok: false,
      title: "Tệp không hợp lệ",
      description: "Ảnh quá nhỏ hoặc bị hỏng, vui lòng chọn tệp khác.",
    };
  }
  if (file.name.length > 200) {
    return { ok: false, title: "Tên tệp quá dài", description: "Vui lòng đổi tên tệp ngắn hơn 200 ký tự." };
  }
  return { ok: true };
}

// Nén & resize ảnh phía client để giảm dung lượng dưới 5MB trước khi upload.
// Bỏ qua HEIC/HEIF (trình duyệt thường không decode được) và GIF (giữ nguyên animation).
const AVATAR_COMPRESS_SKIP = new Set(["image/heic", "image/heif", "image/gif"]);
const AVATAR_TARGET_BYTES = 4.5 * 1024 * 1024; // chừa biên dưới 5MB
const AVATAR_MAX_DIMENSION = 1600;

async function compressAvatarImage(file: File): Promise<File> {
  if (AVATAR_COMPRESS_SKIP.has(file.type)) return file;
  if (file.size <= AVATAR_TARGET_BYTES) return file;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Không đọc được tệp ảnh"));
    r.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Không decode được ảnh"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const hasAlpha = file.type === "image/png" || file.type === "image/webp";
  const mime = hasAlpha ? "image/webp" : "image/jpeg";
  const ext = hasAlpha ? "webp" : "jpg";

  let blob: Blob | null = null;
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, q),
    );
    if (blob && blob.size <= AVATAR_TARGET_BYTES) break;
  }
  if (!blob) return file;

  const baseName = (file.name.split(".").slice(0, -1).join(".") || "avatar").slice(0, 80);
  return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
}

function FamilyPage() {
  // Theme do người dùng quyết định qua Dark/Light toggle toàn cục


  const ctxFn = useServerFn(getMyContext);
  const dashFn = useServerFn(getDashboard);
  const momentsFn = useServerFn(listMoments);
  const remindFn = useServerFn(materializeEventReminders);
  const updateAvatarFn = useServerFn(updateFamilyAvatar);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const { data: ctx } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => ctxFn(),
    staleTime: CTX_STALE_MS,
  });
  const familyId = ctx?.family?.id;
  const { data: dash } = useQuery({
    queryKey: ["family-dashboard", familyId],
    queryFn: () => dashFn({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: DASH_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const { data: momentsData } = useQuery({
    queryKey: ["moments-preview", familyId],
    queryFn: () => momentsFn({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: 60_000,
  });
  const recentMoments = (momentsData?.moments ?? []).slice(0, 8);

  // Best-effort: materialize due event reminders into the notifications table.
  useEffect(() => {
    if (!familyId) return;
    remindFn({ data: { family_id: familyId } }).catch(() => {});
  }, [familyId, remindFn]);


  const familyName = ctx?.family?.name?.trim() || "Gia đình tôi";
  const familyAvatar = ctx?.family?.avatar_url ?? null;
  const isFamilyOwner = !!ctx?.userId && ctx?.family?.owner_id === ctx?.userId;
  const userAvatar = (ctx as { profile?: { avatar_url?: string | null } } | undefined)?.profile?.avatar_url ?? null;

  const avatarMut = useMutation({
    mutationFn: async (file: File) => {
      if (!familyId) throw new Error("Chưa có gia đình");
      if (!ctx?.userId) throw new Error("Cần đăng nhập");
      if (!isFamilyOwner) throw new Error("Chỉ chủ hộ được đổi ảnh gia đình");
      const check = validateAvatarFile(file);
      if (!check.ok) throw new Error(`${check.title}: ${check.description}`);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${ctx.userId}/family-${familyId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      await updateAvatarFn({ data: { familyId, avatarUrl: url } });
      return url;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật ảnh gia đình");
      qc.invalidateQueries({ queryKey: ["my-context"] });
      setPendingFile(null);
    },
    onError: (e: Error) => toast.error("Tải ảnh thất bại", { description: e.message }),
  });
  const userInitial = (
    (ctx as { profile?: { full_name?: string | null } } | undefined)?.profile?.full_name ||
    ctx?.userId ||
    "?"
  )
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase();



  const expCur = dash?.expenses_month.total ?? 0;
  const expPrev = dash?.expenses_prev_month.total ?? 0;
  const expDelta = expPrev > 0 ? ((expCur - expPrev) / expPrev) * 100 : 0;
  const expDown = expDelta <= 0;
  const memberCount = Math.max(dash?.member_count ?? 0, dash?.children.length ?? 0) || 0;

  const foodCount = (dash?.food.expiring_soon ?? 0) + (dash?.food.expired ?? 0);
  const nextMed = dash?.next_medicine;
  const nextAppt = dash?.next_appointment;

  return (
    <MobileShell>
      <SosButton />
      {/* Top bar */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-10 rounded-2xl bg-brand grid place-items-center shadow-[0_4px_12px_-4px_oklch(0.55_0.2_264/0.5)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <polygon points="12,2 14.5,8.5 21.5,9 16,13.5 18,20.5 12,16.5 6,20.5 8,13.5 2.5,9 9.5,8.5" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-tight">
              STOS <span className="font-medium text-muted-foreground">Life</span>
            </p>
            <p className="text-[9px] text-muted-foreground">Vì cuộc sống an tâm</p>
          </div>
        </div>
        <h1 className="text-[17px] font-bold tracking-tight">Gia đình tôi</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/thong-bao"
            aria-label="Thông báo"
            className="relative h-11 w-11 grid place-items-center rounded-full hover:bg-muted/60"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>
          <button className="flex items-center gap-0.5" aria-label="Tài khoản">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={`Avatar ${familyName}`}
                width={36}
                height={36}
                loading="eager"
                decoding="async"
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-tint-blue text-brand grid place-items-center text-sm font-bold ring-2 ring-white shadow" aria-hidden>
                {userInitial}
              </div>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

        </div>
      </header>

      {/* Hero card */}
      <section className="px-4 mt-1">
        <div className="rounded-[28px] bg-card border border-border p-[18px] shadow-sm relative">
          <Link to="/gia-dinh/invites" aria-label="Quản lý gia đình" className="absolute top-4 right-4 h-8 w-8 grid place-items-center text-muted-foreground rounded-full hover:bg-muted/60">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={familyAvatar || HERO_FAMILY_FALLBACK}
                alt={familyName}
                width={112}
                height={112}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className={`h-[112px] w-[112px] rounded-full ${familyAvatar ? "object-cover" : "object-contain bg-white p-1.5 ring-1 ring-border"}`}
              />
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_ACCEPT}
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  // Cho phép format hợp lệ; chỉ chặn sớm nếu sai định dạng/tên.
                  const ext = (f.name.split(".").pop() || "").toLowerCase();
                  const mimeOk = AVATAR_MIME_WHITELIST.includes(f.type as (typeof AVATAR_MIME_WHITELIST)[number]);
                  const extOk = AVATAR_EXT_WHITELIST.includes(ext as (typeof AVATAR_EXT_WHITELIST)[number]);
                  if (!mimeOk || !extOk) {
                    toast.error("Định dạng ảnh không hỗ trợ", {
                      description: `Chỉ chấp nhận JPG, PNG, WEBP, GIF hoặc HEIC.`,
                    });
                    return;
                  }
                  setProcessing(true);
                  try {
                    const originalSize = f.size;
                    const compressed = await compressAvatarImage(f);
                    const check = validateAvatarFile(compressed);
                    if (!check.ok) {
                      toast.error(check.title, { description: check.description });
                      return;
                    }
                    if (compressed.size < originalSize) {
                      toast.success("Đã nén ảnh", {
                        description: `${formatBytes(originalSize)} → ${formatBytes(compressed.size)}`,
                      });
                    }
                    setPendingFile(compressed);
                  } catch (err) {
                    toast.error("Không xử lý được ảnh", {
                      description: err instanceof Error ? err.message : "Vui lòng chọn ảnh khác.",
                    });
                  } finally {
                    setProcessing(false);
                  }
                }}
              />
              {familyId && isFamilyOwner && (
                <button
                  type="button"
                  aria-label="Đổi ảnh gia đình"
                  disabled={avatarMut.isPending || processing}
                  onClick={() => {
                    if (avatarMut.isPending || processing) return;
                    fileRef.current?.click();
                  }}
                  className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-brand grid place-items-center ring-[3px] ring-card disabled:opacity-60 active:scale-95 transition"
                >
                  {avatarMut.isPending || processing ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-1.5">
              <div className="flex items-center gap-2 flex-wrap pr-6">
                <h2 className="text-[22px] font-bold leading-none tracking-tight truncate">{familyName}</h2>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-tint-blue text-brand whitespace-nowrap">
                  {memberCount > 0 ? `${memberCount} thành viên` : "Gia đình"}
                </span>
              </div>
              <p className="mt-2 text-[13px] italic text-muted-foreground leading-[1.45]">
                "Cùng nhau xây dựng tổ ấm
                <br />
                an toàn – hạnh phúc – tiện nghi"{" "}
                <span className="not-italic">💙</span>
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            <HeroAction icon={Users} label="Thành viên" tint="bg-tint-blue" color="text-brand" to="/gia-dinh/thanh-vien" />
            <HeroAction
              icon={Calendar}
              label="Lịch gia đình"
              tint="bg-tint-purple"
              color="text-[oklch(0.65_0.2_295)]"
              to="/lich-gia-dinh"
            />
            <HeroAction
              icon={Bookmark}
              label="Kỷ niệm"
              tint="bg-tint-orange"
              color="text-warning"
              to="/ky-niem-gia-dinh"
            />
            <HeroAction
              icon={Bell}
              label="Nhắc cha mẹ"
              tint="bg-tint-green"
              color="text-success"
              to="/gia-dinh/nhac-cha-me"
            />

          </div>
        </div>
      </section>

      {/* Onboarding banner — hiện khi chưa thiết lập căn hộ */}
      {ctx?.family && !ctx.family.apartment && ctx.family.owner_id === ctx.userId && (
        <section className="px-4 mt-4">
          <Link
            to="/gia-dinh/onboarding"
            className="flex items-center justify-between gap-3 rounded-2xl bg-tint-blue border border-brand/20 p-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-brand grid place-items-center shrink-0">
                <Home className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-tight">Hoàn tất thiết lập hộ</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Đặt tên hộ, gắn căn hộ, mời người thân.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-brand shrink-0" />
          </Link>
        </section>
      )}


      {/* Quản lý gia đình */}
      <section className="px-4 mt-7">
        <div className="flex items-center justify-between mb-3.5 gap-3">
          <h3 className="text-[17px] font-bold tracking-tight">Quản lý gia đình</h3>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/gia-dinh/nhap-ma"
              className="text-[13px] font-semibold text-brand inline-flex items-center gap-1"
            >
              <Ticket className="h-4 w-4" />
              Chấp nhận lời mời
            </Link>
            <Link
              to="/gia-dinh/invites"
              className="text-[13px] font-semibold text-brand inline-flex items-center gap-1"
            >
              <Users className="h-4 w-4" />
              Mời thành viên
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Chi tiêu */}
          <Link to="/chi-tieu" className="block">
            <div className="rounded-[22px] bg-tint-blue p-4 h-full relative">
              <ChevronCircle absolute />
              <div className="flex items-start gap-3 pr-7">
                <div className="h-10 w-10 rounded-2xl bg-brand grid place-items-center shrink-0">
                  <Wallet className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight">Chi tiêu gia đình</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{currentMonthLabel()}</p>
                </div>
              </div>
              <p className="mt-3 text-[20px] font-bold tracking-tight">{formatVnd(expCur)}</p>
              {expPrev > 0 ? (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-[10px] font-medium",
                    expDown ? "text-success" : "text-emergency",
                  )}
                >
                  {expDown ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {Math.abs(expDelta).toFixed(1).replace(".", ",")}% so với tháng trước
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">Chưa có dữ liệu tháng trước</p>
              )}
            </div>
          </Link>

          {/* Đồng hành cùng con */}
          <Link to="/con-cai" className="block">
            <div className="rounded-[22px] bg-card border border-border p-4 h-full relative">
              <ChevronCircle absolute />
              <div className="flex items-start gap-2.5 pr-7">
                <div className="h-10 w-10 rounded-2xl bg-tint-purple grid place-items-center text-xl shrink-0">
                  👧
                </div>
                <p className="flex-1 text-[13px] font-bold leading-tight pt-1.5">
                  Đồng hành cùng con
                </p>
              </div>
              <ul className="mt-3 space-y-2.5">
                {(dash?.children ?? []).slice(0, 2).map((c, i) => (
                  <ChildRow
                    key={c.id}
                    emoji={i === 0 ? "👦" : "🧒"}
                    name={c.name}
                    age={ageFromDob(c.dob)}
                    detail={`${c.today_count} lịch hôm nay`}
                    dot={i === 0 ? "bg-[oklch(0.6_0.2_295)]" : "bg-success"}
                  />
                ))}
                {(dash?.children ?? []).length === 0 && (
                  <li className="text-[11px] text-muted-foreground">Chưa có con nào.</li>
                )}
              </ul>
            </div>
          </Link>

          {/* Thực phẩm & Tủ lạnh */}
          <Link to="/thuc-pham" className="block">
            <div className="rounded-[22px] bg-tint-orange p-4 h-full relative">
              <ChevronCircle absolute />
              <div className="flex items-start gap-2.5 pr-7">
                <div className="h-10 w-10 rounded-2xl bg-warning grid place-items-center shrink-0">
                  <ShoppingBasket className="h-[18px] w-[18px] text-white" />
                </div>
                <p className="flex-1 text-[13px] font-bold leading-tight pt-1.5">
                  Thực phẩm &amp; Tủ lạnh
                </p>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <div className="leading-tight">
                  <p className="text-[30px] font-bold leading-none">{foodCount}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                    {dash && dash.food.expired > 0
                      ? `${dash.food.expired} đã hết hạn`
                      : "thực phẩm"}
                    <br />
                    sắp hết hạn
                  </p>
                </div>
                <div className="flex gap-1 ml-auto">
                  {FOOD_THUMBS.slice(0, Math.min(3, Math.max(foodCount, 1))).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      width={36}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/40"
                    />
                  ))}
                </div>
              </div>
            </div>
          </Link>

          {/* Sức khỏe */}
          <Link to="/suc-khoe" className="block">
            <div className="rounded-[22px] bg-tint-green p-4 h-full relative">
              <ChevronCircle absolute />
              <div className="flex items-start gap-2.5 pr-7">
                <div className="h-10 w-10 rounded-2xl bg-success grid place-items-center shrink-0">
                  <HeartPulse className="h-[18px] w-[18px] text-white" />
                </div>
                <p className="flex-1 text-[13px] font-bold leading-tight pt-1.5">
                  Sức khỏe gia đình
                </p>
              </div>
              <ul className="mt-3 space-y-2.5">
                {nextMed ? (
                  <HealthRow
                    icon={<Pill className="h-3.5 w-3.5 text-emergency" />}
                    tint="bg-tint-red"
                    title={`${nextMed.member_name} uống ${nextMed.medicine}`}
                    detail={nextMed.time_of_day ? `${nextMed.time_of_day.slice(0, 5)} hôm nay` : "Hôm nay"}
                  />
                ) : (
                  <HealthRow
                    icon={<Pill className="h-3.5 w-3.5 text-emergency" />}
                    tint="bg-tint-red"
                    title="Chưa có lịch thuốc"
                    detail="Thêm nhắc thuốc trong mục Sức khỏe"
                  />
                )}
                {nextAppt ? (
                  <HealthRow
                    icon={<Stethoscope className="h-3.5 w-3.5 text-[oklch(0.65_0.2_295)]" />}
                    tint="bg-tint-purple"
                    title={`${nextAppt.member_name} có lịch khám`}
                    detail={formatApptDate(nextAppt.scheduled_at)}
                  />
                ) : (
                  <HealthRow
                    icon={<Stethoscope className="h-3.5 w-3.5 text-[oklch(0.65_0.2_295)]" />}
                    tint="bg-tint-purple"
                    title="Không có lịch khám sắp tới"
                    detail="Đặt lịch trong mục Sức khỏe"
                  />
                )}
              </ul>
            </div>
          </Link>
        </div>
      </section>


      {/* Dịch vụ gia đình */}
      <section className="px-4 mt-7">
        <h3 className="text-[17px] font-bold mb-3.5 tracking-tight">Dịch vụ gia đình</h3>
        <div className="grid grid-cols-5 gap-2.5">
          <ServiceTile icon={Plane} label="Cả nhà du lịch" tint="bg-tint-blue" color="text-brand" to="/du-lich" />
          <ServiceTile icon={Home} label="Dịch vụ tại nhà" tint="bg-tint-green" color="text-success" to="/quan-ly-giup-viec" />
          <ServiceTile icon={Car} label="Đặt xe gia đình" tint="bg-tint-orange" color="text-warning" />
          <ServiceTile
            icon={ShoppingCart}
            label="Mua sắm hộ"
            tint="bg-tint-purple"
            color="text-[oklch(0.65_0.2_295)]"
          />
          <ServiceTile icon={Crown} label={"Gói dịch vụ\nưu đãi"} tint="bg-tint-orange" color="text-warning" />
        </div>
      </section>

      {/* Khoảnh khắc gia đình */}
      <section className="mt-7 pb-2">
        <div className="px-4 flex items-center justify-between mb-3.5">
          <h3 className="text-[17px] font-bold tracking-tight">Khoảnh khắc gia đình</h3>
          <Link to="/khoanh-khac" className="text-[12px] font-semibold text-brand">
            Xem tất cả
          </Link>
        </div>
        {recentMoments.length === 0 ? (
          <div className="mx-4 rounded-2xl border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
            Chưa có khoảnh khắc nào. <Link to="/khoanh-khac" className="text-brand font-semibold">Đăng cái đầu tiên →</Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-none">
            {recentMoments.map((m) => (
              <Link
                key={m.id}
                to="/khoanh-khac"
                className="shrink-0 w-[136px]"
              >
                <div className="h-[136px] w-[136px] rounded-2xl overflow-hidden bg-muted">
                  {m.media_type === "video" ? (
                    <video src={m.media_url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img
                      src={m.thumbnail_url ?? m.media_url}
                      alt={m.caption ?? "Khoảnh khắc"}
                      width={136}
                      height={136}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-tight truncate">
                  {m.caption ?? "Khoảnh khắc"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(m.taken_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {pendingFile && previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-4 animate-in fade-in"
          onClick={() => !avatarMut.isPending && setPendingFile(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-center">Xem trước ảnh gia đình</h3>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Kiểm tra trước khi lưu thay đổi
            </p>
            <div className="mt-4 grid place-items-center">
              <img
                src={previewUrl}
                alt="Xem trước"
                className="h-44 w-44 rounded-full object-cover ring-4 ring-tint-blue"
              />
            </div>
            <p className="mt-3 text-[11px] text-center text-muted-foreground truncate">
              {pendingFile.name} · {(pendingFile.size / 1024).toFixed(0)} KB
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={avatarMut.isPending}
                onClick={() => setPendingFile(null)}
                className="h-11 rounded-2xl border border-border text-sm font-semibold active:bg-muted/40 disabled:opacity-60"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={avatarMut.isPending}
                onClick={() => avatarMut.mutate(pendingFile)}
                className="h-11 rounded-2xl bg-brand text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {avatarMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {avatarMut.isPending ? "Đang lưu..." : "Lưu ảnh"}
              </button>
            </div>
            <button
              type="button"
              disabled={avatarMut.isPending}
              onClick={() => fileRef.current?.click()}
              className="mt-3 w-full text-xs font-medium text-brand active:opacity-70 disabled:opacity-60"
            >
              Chọn ảnh khác
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function HeroAction({
  icon: Icon,
  label,
  tint,
  color,
  to,
}: {
  icon: typeof Users;
  label: string;
  tint: string;
  color: string;
  to?: string;
}) {
  const inner = (
    <div className="flex flex-col items-center gap-2 active:scale-95 transition">
      <div className={cn("h-[58px] w-full rounded-2xl grid place-items-center", tint)}>
        <Icon className={cn("h-6 w-6", color)} strokeWidth={2.4} />
      </div>
      <span className="text-[12px] font-medium text-foreground leading-tight">{label}</span>
    </div>
  );
  return to ? (
    <Link to={to as never} className="block">{inner}</Link>
  ) : (
    <button className="block w-full">{inner}</button>
  );
}


function ChevronCircle({ absolute = false }: { absolute?: boolean }) {
  return (
    <div
      className={cn(
        "h-7 w-7 rounded-full bg-card/70 border border-border grid place-items-center shrink-0",
        absolute && "absolute top-3.5 right-3.5",
      )}
    >
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}


function ChildRow({
  emoji,
  name,
  age,
  detail,
  dot,
}: {
  emoji: string;
  name: string;
  age: string;
  detail: string;
  dot: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-full bg-tint-blue grid place-items-center text-base shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-[12px] font-bold truncate">
          {name} <span className="font-normal text-muted-foreground">{age}</span>
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{detail}</p>
      </div>
      <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
    </li>
  );
}

function HealthRow({
  icon,
  tint,
  title,
  detail,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <div className={cn("h-7 w-7 rounded-full grid place-items-center shrink-0", tint)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-[12px] font-bold truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{detail}</p>
      </div>
    </li>
  );
}


function ServiceTile({
  icon: Icon,
  label,
  tint,
  color,
  to,
}: {
  icon: typeof Plane;
  label: string;
  tint: string;
  color: string;
  to?: string;
}) {
  const inner = (
    <div className="flex flex-col items-center gap-2 active:scale-95 transition">
      <div className={cn("h-[64px] w-full rounded-2xl grid place-items-center", tint)}>
        <Icon className={cn("h-7 w-7", color)} strokeWidth={2.4} />
      </div>
      <span className="text-[11px] font-medium text-center leading-tight whitespace-pre-line min-h-[26px]">
        {label}
      </span>
    </div>
  );
  return to ? (
    <Link to={to as never} className="block">
      {inner}
    </Link>
  ) : (
    <button className="block w-full">{inner}</button>
  );
}
