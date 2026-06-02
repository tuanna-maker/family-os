import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useMemo, lazy, Suspense } from "react";
const QRCodeSVG = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));
import { submitDemoLead } from "@/lib/demo-leads.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { resolveDestinationPure } from "@/lib/resolve-destination";
import {
  Shield, Building2, Users, Bell, MapPin, Phone, ArrowRight, CheckCircle2,
  Sparkles, Truck, Leaf, MessageCircle, Activity, Smartphone, Lock,
  HeartHandshake, Headphones, Star, ChevronRight, Camera, QrCode,
  Bike, Calendar, ShieldCheck, Globe2, Cloud,
  Clock, PlayCircle, Package, ScanLine, Bot, Send,
  Wallet, Gift, Store, Trophy, MapPinned, AlertTriangle, Wrench, Loader2, Mail, User, Building,
  BookOpen, Refrigerator, GraduationCap, Pill, PawPrint, ReceiptText, PiggyBank, Heart, Utensils,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STOS — Hệ điều hành cho cuộc sống chung cư" },
      { name: "description", content: "STOS là nền tảng hỗ trợ cư dân 24/7, kết nối đội ngũ bảo vệ, vận hành và dịch vụ nội khu thành một hệ sinh thái sống hiện đại." },
      { property: "og:title", content: "STOS — Hệ điều hành cho cuộc sống chung cư" },
      { property: "og:description", content: "Bảo vệ, vận hành và dịch vụ nội khu trong một nền tảng — Anh bảo vệ hỗ trợ 24/7." },
      { property: "og:type", content: "website" },
    ],
  }),
  // Đã đăng nhập mà vào "/" (back button, bookmark, link landing) → đẩy
  // thẳng về app home tương ứng (family → /home, guard → /guard, ...).
  // Bỏ qua SSR vì không có session phía server.
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    try {
      const ctx = await getMyContext();
      const to = resolveDestinationPure({ ctx, requestedRedirect: null, entrySource: "landing" });
      if (to && to !== "/") throw redirect({ to, replace: true });
    } catch (e) {
      // Re-throw redirect; nuốt mọi lỗi context khác (giữ landing public)
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: LandingPage,
});


/* ──────────── NAV ──────────── */
function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="stos-glass flex h-14 items-center justify-between rounded-2xl px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--grad-navy)" }}>
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight" style={{ color: "hsl(var(--brand-navy))" }}>STOS</span>
              <span className="hidden sm:inline text-[11px] font-medium text-muted-foreground">Hệ điều hành chung cư</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#ecosystem" className="hover:text-foreground transition-colors">Hệ sinh thái</a>
            <a href="#anhbaove" className="hover:text-foreground transition-colors">Anh bảo vệ</a>
            <a href="#guard" className="hover:text-foreground transition-colors">STOS Guard</a>
            <a href="#life" className="hover:text-foreground transition-colors">STOS Life</a>
            <a href="#family" className="hover:text-foreground transition-colors">Gia đình</a>
            <a href="#command" className="hover:text-foreground transition-colors">Command Center</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" search={{ source: "landing" }} className="inline-flex h-9 items-center px-2.5 sm:px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition">Đăng nhập</Link>
            <Link to="/login" search={{ source: "landing" }} className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              style={{ background: "var(--grad-electric)" }}>
              Dùng thử <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ──────────── 1. HERO ──────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32" style={{ background: "var(--grad-hero)" }}>
      <div className="absolute inset-0 stos-grid-bg pointer-events-none" />
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-30" style={{ background: "hsl(221 83% 70%)" }} />
      <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full blur-3xl opacity-20" style={{ background: "hsl(199 89% 60%)" }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <span className="stos-chip">
              <span className="stos-dot-pulse" /> Hỗ trợ cư dân 24/7 · Phiên bản Việt Nam
            </span>
            <h1 className="stos-h1 mt-6">
              <span className="block">"Có việc gì,</span>
              <span className="block stos-grad-text">cứ gọi em!"</span>
            </h1>
            <p className="stos-lead mt-6 max-w-xl">
              STOS là <strong className="text-foreground font-semibold">nền tảng hỗ trợ cư dân 24/7</strong>,
              kết nối đội ngũ bảo vệ, vận hành và dịch vụ nội khu thành một
              <strong className="text-foreground font-semibold"> hệ sinh thái sống hiện đại</strong>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" search={{ source: "landing" }} className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
                style={{ background: "var(--grad-electric)", boxShadow: "0 14px 40px -10px hsl(var(--brand-electric) / 0.5)" }}>
                Dùng thử nền tảng <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#anhbaove" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-foreground border border-border hover:border-foreground/30 transition">
                <PlayCircle className="h-4 w-4" /> Xem demo hệ thống
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 max-w-lg">
              {[
                { icon: Headphones, t: "Hỗ trợ 24/7" },
                { icon: HeartHandshake, t: "Người thật hỗ trợ" },
                { icon: Building2, t: "Đa tòa nhà" },
                { icon: Smartphone, t: "App cư dân" },
                { icon: ShieldCheck, t: "An ninh chuyên nghiệp" },
                { icon: Truck, t: "Dịch vụ nội khu" },
              ].map((it) => (
                <div key={it.t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <it.icon className="h-4 w-4" style={{ color: "hsl(var(--brand-electric))" }} />
                  <span className="font-medium text-foreground/80">{it.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 relative h-[560px]">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="absolute inset-0">
      <div className="absolute top-2 right-0 w-[78%] stos-card overflow-hidden p-0 stos-float-delay">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-[11px] font-mono text-muted-foreground">stos.vn / command-center</span>
        </div>
        <div className="p-4 space-y-3" style={{ background: "linear-gradient(180deg,#fff,hsl(220 30% 99%))" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Command Center</div>
              <div className="stos-h3 text-sm">12 tòa · 348 sự kiện hôm nay</div>
            </div>
            <span className="stos-chip text-[10px]"><span className="stos-dot-pulse" /> Trực tuyến</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Đang trực", v: "247", c: "var(--brand-success)" },
              { l: "Sự cố", v: "3", c: "var(--brand-warning)" },
              { l: "SLA", v: "99.4%", c: "var(--brand-electric)" },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-border p-2.5">
                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k.l}</div>
                <div className="text-lg font-bold tabular-nums" style={{ color: `hsl(${k.c})` }}>{k.v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border p-3 space-y-2">
            {[
              { who: "Anh Minh · A2-1208", what: "Yêu cầu hỗ trợ chuyển đồ", t: "1 phút", color: "var(--brand-electric)" },
              { who: "Cảm biến · B1-Lobby", what: "Cảnh báo cửa mở bất thường", t: "4 phút", color: "var(--brand-warning)" },
              { who: "Khách · C3-0902", what: "Đăng ký vào lúc 14:30", t: "6 phút", color: "var(--brand-success)" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: `hsl(${r.color})` }} />
                <span className="font-medium text-foreground truncate">{r.who}</span>
                <span className="text-muted-foreground truncate flex-1">{r.what}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">{r.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-[230px] stos-float">
        <div className="rounded-[36px] p-2 shadow-2xl" style={{ background: "var(--grad-navy)" }}>
          <div className="rounded-[28px] bg-white overflow-hidden">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between text-[10px] font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>
              <span>9:41</span>
              <span className="flex items-center gap-1">●●●●●  <span className="font-mono">5G</span></span>
            </div>
            <div className="px-4 pb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">STOS Life</div>
              <div className="text-base font-bold mt-0.5" style={{ color: "hsl(var(--brand-navy))" }}>Chào anh Hải 👋</div>
              <div className="text-[10px] text-muted-foreground">Vinhomes · A2-1208</div>

              <button className="mt-4 w-full rounded-2xl p-4 text-white text-left relative overflow-hidden"
                style={{ background: "var(--grad-electric)", boxShadow: "0 10px 30px -8px hsl(var(--brand-electric) / 0.55)" }}>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Anh bảo vệ hỗ trợ</div>
                    <div className="text-sm font-bold">Bấm để gọi em</div>
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { i: QrCode, l: "QR khách" },
                  { i: Truck, l: "Giao hàng" },
                  { i: Leaf, l: "Farm Fresh" },
                  { i: Wrench, l: "Sửa chữa" },
                ].map((m) => (
                  <div key={m.l} className="flex flex-col items-center gap-1">
                    <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "hsl(221 83% 96%)" }}>
                      <m.i className="h-4 w-4" style={{ color: "hsl(var(--brand-electric))" }} />
                    </span>
                    <span className="text-[9px] font-medium text-muted-foreground">{m.l}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-border p-2.5 text-xs flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full text-white text-[10px] font-bold" style={{ background: "hsl(var(--brand-success))" }}>AM</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ color: "hsl(var(--brand-navy))" }}>Anh Minh đang đến</div>
                  <div className="text-[10px] text-muted-foreground">ETA 2 phút · Tầng B1</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 right-2 w-[180px] stos-card p-3 stos-float">
        <div className="flex items-center gap-2">
          <span className="stos-dot-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">STOS Guard</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl text-white text-sm font-bold" style={{ background: "var(--grad-navy)" }}>M</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>Anh Minh</div>
            <div className="text-[10px] text-muted-foreground">Ca sáng · B1 Lobby</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="rounded-md py-1 px-2" style={{ background: "hsl(152 60% 95%)", color: "hsl(var(--brand-success))" }}>Chấm công ✓</div>
          <div className="rounded-md py-1 px-2" style={{ background: "hsl(221 83% 96%)", color: "hsl(var(--brand-electric))" }}>3/5 chốt</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── 2. POSITIONING ──────────── */
function Positioning() {
  const pillars = [
    { i: Shield,        t: "Vận hành an ninh"   , d: "Tuần tra, ca trực, sự cố, kiểm soát ra/vào — vận hành an ninh chuyên nghiệp đa tòa nhà." },
    { i: HeartHandshake,t: "Hỗ trợ cư dân"   ,    d: "Anh bảo vệ hỗ trợ 24/7. Cư dân gọi một nút — đội vận hành phản hồi tức thì." },
    { i: Users,         t: "Dịch vụ cộng đồng" ,  d: "Cộng đồng cư dân, sự kiện, chợ nội khu, khảo sát, tích điểm." },
    { i: Store,         t: "Thương mại nội khu",d: "Farm Fresh, dịch vụ tại nhà, đặt hàng nội khu, thanh toán liền mạch." },
  ];
  return (
    <section className="py-24 sm:py-32 bg-white relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="stos-chip">Định vị nền tảng</span>
          <h2 className="stos-h2 mt-5">
            Không chỉ là bảo vệ.<br />
            <span className="stos-grad-text">STOS là hạ tầng vận hành cho cuộc sống cư dân.</span>
          </h2>
          <p className="stos-lead mt-5">
            Từ an ninh tới hỗ trợ, từ cộng đồng tới thương mại nội khu — bốn trụ cột vận hành xoay quanh một câu nói rất Việt Nam: <em>"Có việc gì, cứ gọi em."</em>
          </p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <div key={p.t} className="stos-card p-7">
              <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: i % 2 ? "var(--grad-electric)" : "var(--grad-navy)" }}>
                <p.i className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <h3 className="stos-h3 mt-5">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 3. ECOSYSTEM ──────────── */
function Ecosystem() {
  const modules = [
    { i: Smartphone, t: "STOS Life" },
    { i: Shield,     t: "STOS Guard" },
    { i: Activity,   t: "Command Center" },
    { i: Leaf,       t: "Farm Fresh" },
    { i: Truck,      t: "Giao hàng nội khu" },
    { i: MessageCircle, t: "Cộng đồng cư dân" },
    { i: QrCode,     t: "Quản lý khách" },
    { i: AlertTriangle, t: "SOS & Incident" },
    { i: Wrench,     t: "Dịch vụ tại nhà" },
  ];
  return (
    <section id="ecosystem" className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "linear-gradient(180deg,hsl(220 30% 98%),#fff)" }}>
      <div className="absolute inset-0 stos-grid-bg opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="stos-chip">Hệ sinh thái</span>
          <h2 className="stos-h2 mt-5">Một nền tảng. <span className="stos-grad-text">Mọi mảnh ghép vận hành.</span></h2>
          <p className="stos-lead mt-5">9 module hoạt động trên cùng một dữ liệu, một danh tính cư dân, một đội vận hành.</p>
        </div>

        <div className="relative mt-16 mx-auto max-w-4xl aspect-square sm:aspect-[5/4]">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 640" fill="none" preserveAspectRatio="none">
            {[
              "M400 320 L130 80",  "M400 320 L670 80",
              "M400 320 L60 320",  "M400 320 L740 320",
              "M400 320 L130 560", "M400 320 L670 560",
              "M400 320 L400 60",  "M400 320 L400 580",
              "M400 320 L740 460",
            ].map((d, i) => (
              <path key={i} d={d} stroke="hsl(221 83% 75%)" strokeWidth="1.2" className="stos-line" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
            <circle cx="400" cy="320" r="80" fill="url(#g1)" opacity="0.12" />
            <defs>
              <radialGradient id="g1"><stop offset="0%" stopColor="hsl(221 83% 53%)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
            </defs>
          </svg>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="grid h-32 w-32 sm:h-40 sm:w-40 place-items-center rounded-full text-white shadow-2xl"
              style={{ background: "var(--grad-navy)", boxShadow: "0 30px 80px -20px hsl(var(--brand-navy) / 0.6)" }}>
              <div className="text-center">
                <Shield className="h-7 w-7 mx-auto" />
                <div className="mt-1 text-base font-bold">STOS</div>
                <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">Nền tảng</div>
              </div>
            </div>
          </div>

          {modules.map((m, i) => {
            const angle = (i / modules.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 42;
            const y = 50 + Math.sin(angle) * 40;
            return (
              <div key={m.t}
                className="absolute -translate-x-1/2 -translate-y-1/2 stos-card px-3 py-2.5 flex items-center gap-2 min-w-[140px]"
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.1}s` }}>
                <span className="grid h-8 w-8 place-items-center rounded-lg shrink-0" style={{ background: "hsl(221 83% 96%)" }}>
                  <m.i className="h-4 w-4" style={{ color: "hsl(var(--brand-electric))" }} />
                </span>
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>{m.t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 4. ANH BẢO VỆ ──────────── */
function AnhBaoVe() {
  const steps = [
    { i: Phone,     t: "Cư dân bấm hỗ trợ",  d: "Một nút lớn trong STOS Life — không cần gõ, không cần chờ." },
    { i: Bell,      t: "Anh bảo vệ nhận",    d: "Yêu cầu vào tablet STOS Guard, kèm vị trí và mô tả ngắn." },
    { i: Bike,      t: "Điều phối tức thời", d: "Hệ thống chọn anh gần nhất, rảnh nhất, phù hợp nhất." },
    { i: MapPinned, t: '"Anh Minh đang đến"',d: "Cư dân thấy ETA, tên anh, hình ảnh — yên tâm 100%." },
    { i: CheckCircle2, t: "Hoàn tất & đánh giá", d: "Cư dân xác nhận, đánh giá. Vận hành thấy SLA, KPI ngay." },
  ];
  return (
    <section id="anhbaove" className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--grad-navy)" }}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 20%, hsl(221 83% 60% / 0.4), transparent 40%), radial-gradient(circle at 80% 80%, hsl(199 89% 60% / 0.3), transparent 40%)"
      }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-white">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Tính năng signature
          </span>
          <h2 className="stos-h2 mt-5 text-white">"Anh bảo vệ hỗ trợ"</h2>
          <p className="text-xl sm:text-2xl mt-3 font-medium" style={{ color: "hsl(199 89% 80%)" }}>Grab nội khu cho cư dân.</p>
          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-2xl">
            Cư dân cần xách đồ, đẩy xe, sửa cầu chì, gọi taxi, dắt người già — bấm một nút.
            Đội bảo vệ thân thuộc trong toà nhà nhận, xác nhận, có mặt trong vài phút.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-[280px]">
              <div className="rounded-[42px] p-2 shadow-2xl bg-white/10 backdrop-blur border border-white/20">
                <div className="rounded-[34px] bg-white overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between text-xs font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>
                    <span>9:41</span>
                    <span>●●●● 5G</span>
                  </div>
                  <div className="px-5 pb-5 space-y-3">
                    <div className="text-center py-3">
                      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Yêu cầu hỗ trợ</div>
                      <div className="text-lg font-bold mt-1" style={{ color: "hsl(var(--brand-navy))" }}>Anh Minh đang đến</div>
                      <div className="text-2xl font-extrabold tabular-nums mt-1" style={{ color: "hsl(var(--brand-electric))" }}>ETA 2:14</div>
                    </div>
                    <div className="rounded-2xl overflow-hidden h-32 relative" style={{ background: "linear-gradient(135deg, hsl(220 30% 96%), hsl(199 50% 92%))" }}>
                      <div className="absolute inset-0 stos-grid-bg opacity-60" />
                      <div className="absolute top-1/2 left-[20%] -translate-y-1/2">
                        <div className="grid h-8 w-8 place-items-center rounded-full text-white text-xs font-bold shadow-lg" style={{ background: "hsl(var(--brand-success))" }}>M</div>
                      </div>
                      <div className="absolute top-1/2 right-[20%] -translate-y-1/2">
                        <div className="grid h-8 w-8 place-items-center rounded-full text-white text-xs font-bold shadow-lg" style={{ background: "hsl(var(--brand-electric))" }}>H</div>
                      </div>
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
                        <path d="M40 50 Q100 20 160 50" stroke="hsl(var(--brand-electric))" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl p-3 border border-border">
                      <span className="grid h-10 w-10 place-items-center rounded-full text-white font-bold" style={{ background: "hsl(var(--brand-success))" }}>AM</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold" style={{ color: "hsl(var(--brand-navy))" }}>Anh Minh · 8 năm</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 fill-current" style={{ color: "hsl(var(--brand-warning))" }} /> 4.9 · 1,230 lượt</div>
                      </div>
                      <button className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: "var(--grad-electric)" }}>
                        <Phone className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 stos-card px-3 py-2 text-xs flex items-center gap-1.5" style={{ background: "white" }}>
                <span className="stos-dot-pulse" />
                <span className="font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>Theo dõi trực tiếp</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {steps.map((s, i) => (
              <div key={s.t} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/10">
                <div className="grid h-11 w-11 place-items-center rounded-xl text-white shrink-0" style={{ background: "var(--grad-electric)" }}>
                  <s.i className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Bước {String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="font-semibold text-white">{s.t}</div>
                  <div className="text-sm text-white/65 mt-0.5">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── 5. STOS GUARD ──────────── */
function StosGuard() {
  const features = [
    { i: Calendar, t: "Phân ca thông minh" },
    { i: ScanLine, t: "Chấm công GPS · QR" },
    { i: MapPin,   t: "Tuần tra checkpoint" },
    { i: AlertTriangle, t: "Sự cố & SOS" },
    { i: QrCode,   t: "Khách & xe ra/vào" },
    { i: Package,  t: "Nhận & giao hàng" },
    { i: Wallet,   t: "Lương · thưởng · phạt" },
    { i: Building2,t: "Vận hành đa địa điểm" },
  ];
  return (
    <section id="guard" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="stos-chip">STOS Guard</span>
            <h2 className="stos-h2 mt-5">Nền tảng vận hành <span className="stos-grad-text">đội ngũ bảo vệ</span> chuyên nghiệp.</h2>
            <p className="stos-lead mt-5">
              Từ tuyển dụng, phân ca, chấm công, tuần tra, đến lương — toàn bộ vòng đời vận hành nhân sự bảo vệ trong một ứng dụng tablet/điện thoại.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <div key={f.t} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-foreground/20 transition">
                  <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "hsl(221 83% 96%)" }}>
                    <f.i className="h-4 w-4" style={{ color: "hsl(var(--brand-electric))" }} />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{f.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stos-card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: "var(--grad-navy)" }}>
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>STOS Guard · Vinhomes Smart City</span>
              </div>
              <span className="stos-chip text-[10px]"><span className="stos-dot-pulse" /> 24 anh trực</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {[
                { l: "Đang trực", v: "24", c: "var(--brand-success)" },
                { l: "Tuần tra", v: "8", c: "var(--brand-electric)" },
                { l: "Sự cố mở", v: "2", c: "var(--brand-warning)" },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-border p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{k.l}</div>
                  <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: `hsl(${k.c})` }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Lịch trực hôm nay</div>
              <div className="space-y-1.5">
                {[
                  { n: "Anh Minh",   c: "Sáng 06–14",  z: "B1 Lobby",   s: "Đang trực" },
                  { n: "Anh Tuấn",   c: "Sáng 06–14",  z: "Hầm xe B2",  s: "Tuần tra" },
                  { n: "Anh Phong",  c: "Chiều 14–22", z: "Cổng chính", s: "Chuẩn bị" },
                  { n: "Anh Khánh",  c: "Đêm 22–06",   z: "Tầng cao",   s: "Nghỉ" },
                ].map((r) => (
                  <div key={r.n} className="grid grid-cols-12 gap-2 items-center text-xs py-2 border-b border-border last:border-0">
                    <div className="col-span-3 font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>{r.n}</div>
                    <div className="col-span-3 font-mono text-[10px] text-muted-foreground">{r.c}</div>
                    <div className="col-span-3 text-muted-foreground">{r.z}</div>
                    <div className="col-span-3 text-right">
                      <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: r.s === "Đang trực" ? "hsl(152 60% 95%)" : r.s === "Tuần tra" ? "hsl(221 83% 96%)" : r.s === "Chuẩn bị" ? "hsl(28 92% 95%)" : "hsl(220 14% 95%)",
                          color: r.s === "Đang trực" ? "hsl(var(--brand-success))" : r.s === "Tuần tra" ? "hsl(var(--brand-electric))" : r.s === "Chuẩn bị" ? "hsl(var(--brand-warning))" : "hsl(220 14% 40%)",
                        }}>{r.s}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── 6. STOS LIFE ──────────── */
function StosLife() {
  const items = [
    { i: AlertTriangle, t: "SOS khẩn cấp",  d: "Một nút gọi cứu trợ — đội bảo vệ + BQL nhận tức thì." },
    { i: QrCode,        t: "QR khách thăm",    d: "Cấp QR cho khách trong 5 giây, hết hạn tự động." },
    { i: Truck,         t: "Giao hàng nội khu", d: "Bảo vệ nhận, đưa lên căn — không lo mất, không cần xuống." },
    { i: Wrench,        t: "Yêu cầu sửa chữa", d: "Mô tả + ảnh + video, đội kỹ thuật đến đúng giờ." },
    { i: Leaf,          t: "Farm Fresh",    d: "Đặt rau sạch buổi sáng, nhận tận căn buổi chiều." },
    { i: MessageCircle, t: "Cộng đồng",     d: "Bảng tin tòa, marketplace, sự kiện, khảo sát BQL." },
    { i: HeartHandshake,t: "Dịch vụ tại nhà", d: "Vệ sinh, giặt ủi, trông trẻ — đối tác đã thẩm định." },
    { i: Wallet,        t: "Thanh toán",    d: "Phí dịch vụ, đơn hàng, hoá đơn — một ví duy nhất." },
  ];
  return (
    <section id="life" className="py-24 sm:py-32" style={{ background: "linear-gradient(180deg,#fff,hsl(220 30% 98%))" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="flex justify-center order-2 lg:order-1">
            <div className="relative w-[300px]">
              <div className="rounded-[44px] p-2 shadow-2xl" style={{ background: "var(--grad-navy)", boxShadow: "0 30px 80px -10px hsl(var(--brand-navy) / 0.4)" }}>
                <div className="rounded-[36px] bg-white overflow-hidden">
                  <div className="px-5 pt-4 pb-2 flex items-center justify-between text-xs font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>
                    <span>9:41</span><span>●●●● 5G</span>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">STOS Life</div>
                        <div className="text-base font-bold" style={{ color: "hsl(var(--brand-navy))" }}>Xin chào Linh 👋</div>
                      </div>
                      <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "hsl(221 83% 96%)" }}>
                        <Bell className="h-4 w-4" style={{ color: "hsl(var(--brand-electric))" }} />
                      </div>
                    </div>

                    <button className="mt-4 w-full rounded-3xl p-4 text-white text-left relative overflow-hidden"
                      style={{ background: "var(--grad-electric)" }}>
                      <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Anh bảo vệ hỗ trợ</div>
                      <div className="text-lg font-bold mt-1">Có việc gì, cứ gọi em!</div>
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 opacity-80" />
                    </button>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[
                        { i: QrCode, l: "QR khách", c: "hsl(221 83% 53%)" },
                        { i: Truck,  l: "Giao hàng", c: "hsl(28 92% 56%)" },
                        { i: Leaf,   l: "Farm Fresh", c: "hsl(152 60% 42%)" },
                        { i: Wrench, l: "Sửa chữa",  c: "hsl(258 70% 60%)" },
                        { i: AlertTriangle, l: "SOS", c: "hsl(0 78% 56%)" },
                        { i: MessageCircle, l: "Cộng đồng", c: "hsl(199 89% 50%)" },
                        { i: Wallet, l: "Ví & phí", c: "hsl(var(--brand-navy))" },
                        { i: Gift,   l: "Ưu đãi",   c: "hsl(338 70% 55%)" },
                      ].map((m) => (
                        <div key={m.l} className="flex flex-col items-center gap-1.5">
                          <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${m.c.replace(")", " / 0.1)")}` }}>
                            <m.i className="h-[18px] w-[18px]" style={{ color: m.c }} />
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{m.l}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl p-3 border border-border">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Đang diễn ra</div>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "hsl(28 92% 95%)" }}>
                          <Truck className="h-4 w-4" style={{ color: "hsl(28 92% 50%)" }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: "hsl(var(--brand-navy))" }}>Đơn rau Farm Fresh #2841</div>
                          <div className="text-[10px] text-muted-foreground">Anh Tuấn đang giao · ETA 8 phút</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="stos-chip">STOS Life</span>
            <h2 className="stos-h2 mt-5">Một <span className="stos-grad-text">super app</span> cho cuộc sống cư dân.</h2>
            <p className="stos-lead mt-5">
              Tất cả nhu cầu của một cư dân hiện đại, từ an ninh tới ăn uống, gói gọn trong một ứng dụng do chính tòa nhà của họ vận hành.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {items.map((it) => (
                <div key={it.t} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl shrink-0" style={{ background: "hsl(221 83% 96%)" }}>
                    <it.i className="h-[18px] w-[18px]" style={{ color: "hsl(var(--brand-electric))" }} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{it.t}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── 6.5 FAMILY LIFE ──────────── */
function FamilyLife() {
  const features = [
    { i: Shield,         t: "Dịch vụ Bảo an",       d: "An toàn gia đình là ưu tiên — gọi hỗ trợ 24/7 chỉ với một chạm.", c: "hsl(221 83% 53%)" },
    { i: BookOpen,       t: "Sổ tay gia đình",      d: "Một nơi quản lý mọi thứ của gia đình: thành viên, giấy tờ, ghi chú quan trọng.", c: "hsl(152 60% 42%)" },
    { i: PiggyBank,      t: "Chi tiêu gia đình",    d: "Nhập liệu nhanh, chụp hoá đơn (OCR) tự động phân loại và tổng hợp theo tháng.", c: "hsl(199 89% 50%)" },
    { i: Refrigerator,   t: "Thực phẩm & Tủ lạnh",  d: "Theo dõi hạn sử dụng, gợi ý món ăn từ nguyên liệu đang có trong tủ lạnh.", c: "hsl(160 60% 40%)" },
    { i: GraduationCap,  t: "Lịch học & Gia đình",  d: "Lịch học, sự kiện, việc nhà của cả nhà — đồng bộ và nhắc nhở thông minh.", c: "hsl(258 70% 60%)" },
    { i: Pill,           t: "Thuốc & Sức khoẻ",     d: "Nhắc uống thuốc, lịch khám, hồ sơ sức khoẻ từng thành viên.", c: "hsl(0 78% 56%)" },
    { i: PawPrint,       t: "Thú cưng",             d: "Lịch tiêm phòng, chăm sóc, nhắc tắm — sổ sức khoẻ cho boss của gia đình.", c: "hsl(338 70% 55%)" },
    { i: ReceiptText,    t: "Phí dịch vụ & Hoá đơn",d: "Phí quản lý, điện, nước, internet — thanh toán nhanh trong một ví duy nhất.", c: "hsl(28 92% 50%)" },
  ];
  return (
    <section id="family" className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "linear-gradient(180deg,hsl(220 30% 98%),#fff)" }}>
      <div className="absolute inset-0 stos-grid-bg opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="stos-chip"><Heart className="h-3 w-3" /> Cuộc sống gia đình</span>
          <h2 className="stos-h2 mt-5">
            Không chỉ an ninh — <span className="stos-grad-text">STOS chăm lo cả tổ ấm của bạn.</span>
          </h2>
          <p className="stos-lead mt-5">
            8 tiện ích quản lý cuộc sống gia đình trong cùng một app cư dân: từ chi tiêu, sức khoẻ, lịch học của con,
            tới tủ lạnh và thú cưng — tất cả gói gọn trong <em>STOS Life</em>.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.t} className="stos-card p-6 group hover:-translate-y-0.5 transition">
              <span className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{ background: `${f.c.replace(")", " / 0.12)")}` }}>
                <f.i className="h-5 w-5" style={{ color: f.c }} strokeWidth={2} />
              </span>
              <h3 className="stos-h3 mt-5 text-base">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid lg:grid-cols-3 gap-5">
          {[
            { i: Utensils,      t: "Gợi ý món ăn AI",    d: "Dựa trên nguyên liệu có sẵn và khẩu vị từng thành viên." },
            { i: Bell,          t: "Nhắc nhở thông minh", d: "Uống thuốc, đóng phí, đón con — đúng lúc, đúng người." },
            { i: Lock,          t: "Riêng tư tuyệt đối",  d: "Dữ liệu gia đình mã hoá — chỉ thành viên được mời mới truy cập." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-white p-5 flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl shrink-0" style={{ background: "hsl(221 83% 96%)" }}>
                <f.i className="h-[18px] w-[18px]" style={{ color: "hsl(var(--brand-electric))" }} />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{f.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 7. FARM FRESH ──────────── */
function FarmFresh() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="stos-chip" style={{ background: "hsl(152 60% 95%)", color: "hsl(152 60% 30%)", borderColor: "hsl(152 60% 88%)" }}>
              <Leaf className="h-3 w-3" /> Farm Fresh
            </span>
            <h2 className="stos-h2 mt-5">"Từ <span style={{ color: "hsl(152 60% 38%)" }}>nông trại</span> tới <span className="stos-grad-text">căn hộ</span>"</h2>
            <p className="stos-lead mt-5">
              Chuỗi cung ứng rau sạch khép kín — minh bạch nguồn gốc, giao trong ngày, do chính đội bảo vệ tòa nhà phân phối tới căn hộ.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { i: ShieldCheck, t: "Chuẩn VietGAP",   d: "Hồ sơ canh tác đầy đủ" },
                { i: ScanLine,    t: "Truy xuất QR",     d: "Quét để xem lô · ngày · trại" },
                { i: Camera,      t: "Nhật ký thu hoạch", d: "Ảnh & video từ nông trại" },
                { i: Bike,        t: "Giao trong ngày",   d: "Đội nội khu giao tận căn" },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl border border-border p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "hsl(152 60% 95%)" }}>
                    <f.i className="h-4 w-4" style={{ color: "hsl(152 60% 38%)" }} />
                  </span>
                  <div className="mt-3 text-sm font-semibold text-foreground">{f.t}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="stos-card p-6">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden relative" style={{
                background: "linear-gradient(135deg, hsl(152 60% 92%) 0%, hsl(80 50% 88%) 50%, hsl(45 70% 90%) 100%)"
              }}>
                <div className="absolute inset-0" style={{
                  backgroundImage: "radial-gradient(circle at 30% 40%, hsl(152 60% 60% / 0.4), transparent 30%), radial-gradient(circle at 70% 60%, hsl(80 60% 55% / 0.35), transparent 35%), radial-gradient(circle at 50% 80%, hsl(45 80% 65% / 0.3), transparent 30%)"
                }} />
                <div className="absolute bottom-4 right-4 stos-card p-3 w-[140px]">
                  <div className="grid grid-cols-8 gap-px h-20">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div key={i} className="rounded-[1px]" style={{ background: (i * 13) % 7 > 3 ? "hsl(var(--brand-navy))" : "transparent" }} />
                    ))}
                  </div>
                  <div className="text-[9px] font-mono mt-1.5 text-muted-foreground">LOT-VG-2486 · 12.05.26</div>
                </div>
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg" style={{ background: "hsl(152 60% 38%)" }}>
                  <Leaf className="h-3.5 w-3.5" /> Hái sáng nay · 06:12
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "Trang trại", v: "12" },
                  { l: "Mã sản phẩm", v: "240+" },
                  { l: "Giao trong ngày", v: "100%" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-xl font-bold" style={{ color: "hsl(152 60% 38%)" }}>{s.v}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── 8. COMMUNITY ──────────── */
function Community() {
  return (
    <section className="py-24 sm:py-32" style={{ background: "linear-gradient(180deg,hsl(220 30% 98%),#fff)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="stos-chip">Cộng đồng</span>
          <h2 className="stos-h2 mt-5">Tòa nhà của bạn, <span className="stos-grad-text">cộng đồng của bạn.</span></h2>
          <p className="stos-lead mt-5">Một không gian số ấm áp — nơi cư dân kết nối, chia sẻ, mua bán và cùng xây dựng nếp sống tòa nhà.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { i: MessageCircle, t: "Bảng tin cư dân", d: "Thông báo BQL, sự kiện tòa, hỏi đáp hàng xóm." },
            { i: Calendar,      t: "Sự kiện",         d: "Trung thu, Tết, sinh nhật tòa — đăng ký, check-in." },
            { i: Store,         t: "Chợ nội khu",     d: "Bán đồ cũ, dịch vụ tay nghề trong tòa." },
            { i: Trophy,        t: "Tích điểm",         d: "Tích điểm dùng dịch vụ, đổi quà, bậc cư dân." },
          ].map((c, i) => (
            <div key={c.t} className="stos-card p-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: i % 2 === 0 ? "var(--grad-electric)" : "var(--grad-navy)" }}>
                <c.i className="h-5 w-5 text-white" />
              </div>
              <h3 className="stos-h3 mt-5">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 9. COMMAND CENTER ──────────── */
function CommandCenter() {
  return (
    <section id="command" className="py-24 sm:py-32" style={{ background: "var(--grad-navy)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-white">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <Activity className="h-3.5 w-3.5" /> Command Center
          </span>
          <h2 className="stos-h2 mt-5 text-white">Một bảng điều khiển. <span style={{ color: "hsl(199 89% 75%)" }}>Toàn bộ vận hành.</span></h2>
          <p className="mt-5 text-lg text-white/70 max-w-2xl">
            Đa tòa nhà, đa địa điểm. Sự cố, bảo vệ, SLA, KPI, AI cảnh báo — theo dõi real-time như trung tâm điều hành quốc gia.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 shadow-2xl">
          <div className="rounded-2xl bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: "var(--grad-navy)" }}>
                  <Activity className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>STOS Command Center</span>
                <span className="stos-chip text-[10px]"><span className="stos-dot-pulse" /> 12 tòa · Live</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">12.05.2026 · 14:32:08</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-0">
              <div className="lg:col-span-4 p-5 space-y-4 border-r border-border">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { l: "Bảo vệ online", v: "247", d: "+12", c: "var(--brand-success)" },
                    { l: "Sự cố mở",      v: "3",   d: "−2",  c: "var(--brand-warning)" },
                    { l: "SLA hôm nay",   v: "99.4%", d: "+0.3%", c: "var(--brand-electric)" },
                    { l: "Hỗ trợ cư dân", v: "126", d: "+18", c: "hsl(258 70% 55%)" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-xl border border-border p-3">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k.l}</div>
                      <div className="text-xl font-bold tabular-nums mt-1" style={{ color: `hsl(${k.c})` }}>{k.v}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{k.d} hôm qua</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Sự cố mới</div>
                  <div className="space-y-1.5">
                    {[
                      { s: "Nghiêm trọng", t: "Báo cháy giả · Tòa B1", a: "2 phút", c: "hsl(0 78% 56%)" },
                      { s: "Cảnh báo",     t: "Cửa hầm mở quá lâu",   a: "5 phút", c: "hsl(28 92% 56%)" },
                      { s: "Thông tin",    t: "Khách đợi ở lễ tân",   a: "8 phút", c: "hsl(221 83% 53%)" },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1.5">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: r.c }} />
                        <span className="text-[10px] font-mono uppercase tracking-wider shrink-0" style={{ color: r.c }}>{r.s}</span>
                        <span className="flex-1 truncate text-foreground">{r.t}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{r.a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 p-5 border-r border-border">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Bản đồ vị trí trực · Hà Nội</div>
                <div className="aspect-[4/3] rounded-xl overflow-hidden relative" style={{ background: "hsl(220 30% 96%)" }}>
                  <div className="absolute inset-0 stos-grid-bg opacity-80" />
                  {[
                    { x: 20, y: 30, c: "var(--brand-success)" },
                    { x: 45, y: 50, c: "var(--brand-success)" },
                    { x: 65, y: 25, c: "var(--brand-warning)" },
                    { x: 80, y: 55, c: "var(--brand-success)" },
                    { x: 30, y: 70, c: "var(--brand-electric)" },
                    { x: 55, y: 80, c: "var(--brand-success)" },
                    { x: 70, y: 70, c: "hsl(0 78% 56%)" },
                  ].map((p, i) => (
                    <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                      <span className="block h-2.5 w-2.5 rounded-full ring-4 ring-white shadow" style={{ background: `hsl(${p.c})` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--brand-success))" }} /> Trực tuyến</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--brand-warning))" }} /> Cảnh báo</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(0 78% 56%)" }} /> Khẩn cấp</span>
                </div>
              </div>

              <div className="lg:col-span-3 p-5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Bot className="h-3 w-3" /> Gợi ý AI
                </div>
                <div className="space-y-2">
                  {[
                    "Tòa B1 thiếu 1 anh ca chiều",
                    "Lưu lượng khách tăng 23%",
                    "Sự cố cửa hầm đã 3 lần / tuần",
                    "SLA hỗ trợ giảm 0.8% giờ cao điểm",
                  ].map((s, i) => (
                    <div key={i} className="rounded-lg border border-border p-2.5 text-xs">
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(var(--brand-electric))" }} />
                        <span className="text-foreground/80">{s}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── 10. BUSINESS MODEL ──────────── */
function BusinessModel() {
  const audiences = [
    { i: Shield,    t: "Công ty bảo vệ",     d: "Thắng thầu nhanh hơn, vận hành đa địa điểm hiệu quả, mở thêm dòng doanh thu dịch vụ." },
    { i: Building2, t: "BQL tòa nhà",         d: "Cư dân hài lòng hơn, KPI minh bạch, giảm 30–50% thời gian xử lý sự cố." },
    { i: Smartphone,t: "Cư dân",              d: "Có một anh bảo vệ online 24/7, mọi việc chỉ cần một nút." },
    { i: Store,     t: "Đối tác dịch vụ",     d: "Tiếp cận hàng nghìn cư dân được xác thực, thanh toán liền mạch." },
  ];
  const metrics = [
    { v: "−42%", l: "Thời gian xử lý sự cố" },
    { v: "−28%", l: "Chi phí vận hành" },
    { v: "+4.7", l: "Điểm hài lòng cư dân /5" },
    { v: "+3 dòng", l: "Doanh thu dịch vụ mới" },
  ];
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="stos-chip">Giá trị nền tảng</span>
          <h2 className="stos-h2 mt-5">Một nền tảng — <span className="stos-grad-text">bốn bên cùng thắng.</span></h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {audiences.map((a, i) => (
            <div key={a.t} className="stos-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: i % 2 ? "var(--grad-navy)" : "var(--grad-electric)" }}>
                <a.i className="h-5 w-5 text-white" />
              </div>
              <h3 className="stos-h3 mt-5 text-base">{a.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-3xl p-6 sm:p-10" style={{ background: "linear-gradient(135deg, hsl(220 30% 98%), hsl(221 83% 96%))" }}>
          {metrics.map((m) => (
            <div key={m.l} className="text-center">
              <div className="stos-grad-text text-3xl sm:text-5xl font-extrabold tracking-tight">{m.v}</div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">{m.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 11. MOBILE-FIRST ──────────── */
function MobileFirst() {
  return (
    <section className="py-24 sm:py-32" style={{ background: "linear-gradient(180deg,#fff,hsl(220 30% 98%))" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="stos-chip">Ưu tiên di động</span>
          <h2 className="stos-h2 mt-5">Sẵn sàng cho <span className="stos-grad-text">iOS, Android & Tablet</span>.</h2>
          <p className="stos-lead mt-5">App cư dân, app bảo vệ, chế độ tablet cho lễ tân — sẵn sàng vận hành thực tế, ưu tiên hoạt động offline.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {[
            { t: "STOS Life · iOS",     s: "Native · Ưu tiên offline", c: "var(--grad-electric)" },
            { t: "STOS Guard · Android",s: "Tablet & Điện thoại",          c: "var(--grad-navy)" },
            { t: "Lễ tân · Chế độ tablet",s: "Khách · Bưu kiện" ,       c: "linear-gradient(135deg, hsl(258 70% 55%), hsl(221 83% 53%))" },
          ].map((d) => (
            <div key={d.t} className="stos-card p-6">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden relative" style={{ background: d.c }}>
                <div className="absolute inset-0 stos-grid-bg opacity-20" />
                <div className="absolute inset-6 rounded-xl bg-white/95 p-3 flex flex-col">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{d.t}</div>
                  <div className="mt-1 text-sm font-bold" style={{ color: "hsl(var(--brand-navy))" }}>{d.s}</div>
                  <div className="mt-3 grid grid-cols-3 gap-1.5 flex-1 content-start">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg" style={{
                        background: ["hsl(221 83% 96%)","hsl(152 60% 95%)","hsl(28 92% 95%)","hsl(258 70% 95%)","hsl(199 89% 95%)","hsl(0 78% 96%)"][i % 6]
                      }} />
                    ))}
                  </div>
                  <div className="mt-3 h-1 rounded-full" style={{ background: "hsl(220 18% 90%)" }}>
                    <div className="h-full rounded-full w-2/3" style={{ background: "var(--grad-electric)" }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{d.t}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 12. TRUST ──────────── */
function Trust() {
  const items = [
    { i: Clock,    t: "Vận hành 24/7" },
    { i: HeartHandshake, t: "Đội hỗ trợ thật" },
    { i: Building2,t: "SaaS đa khách hàng" },
    { i: Cloud,    t: "Cloud + On-premise" },
    { i: Lock,     t: "Sẵn sàng ISO 27001 · SOC2" },
    { i: ShieldCheck, t: "SLA 99.9% có cam kết" },
  ];
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="stos-chip">Tin cậy & Vận hành</span>
          <h2 className="stos-h2 mt-5">Doanh nghiệp tin tưởng. <span className="stos-grad-text">Cư dân yên tâm.</span></h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.t} className="flex items-center gap-4 stos-card p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "hsl(221 83% 96%)" }}>
                <it.i className="h-5 w-5" style={{ color: "hsl(var(--brand-electric))" }} />
              </div>
              <span className="text-base font-semibold text-foreground">{it.t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── 13. FINAL CTA ──────────── */
function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--grad-navy)" }}>
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 25% 30%, hsl(221 83% 60% / 0.5), transparent 40%), radial-gradient(circle at 75% 70%, hsl(199 89% 55% / 0.4), transparent 40%)"
      }} />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center text-white">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Bắt đầu cùng STOS
        </span>
        <h2 className="stos-h1 mt-6 text-white">"Có việc gì, <span style={{ color: "hsl(199 89% 75%)" }}>cứ gọi em!"</span></h2>
        <p className="mt-6 text-lg sm:text-xl text-white/75 max-w-2xl mx-auto">
          STOS giúp công ty bảo vệ trở thành <strong className="text-white font-semibold">hạ tầng vận hành cho toàn bộ cuộc sống cư dân</strong>.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="#demo" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold transition hover:scale-[1.02]"
            style={{ color: "hsl(var(--brand-navy))" }}>
            Đăng ký demo <ArrowRight className="h-4 w-4" />
          </a>
          <a href="mailto:hello@stos.vn" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
            <Send className="h-4 w-4" /> Liên hệ tư vấn
          </a>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Triển khai trong 14 ngày</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Hỗ trợ tiếng Việt</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Không phí khởi tạo</span>
        </div>
      </div>
    </section>
  );
}

/* ──────────── 14. DEMO FORM ──────────── */
function DemoForm() {
  const [form, setForm] = useState({ full_name: "", company: "", email: "", phone: "", scale: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const name = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) {
      toast.error("Vui lòng nhập họ tên, email và số điện thoại");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email không hợp lệ");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await submitDemoLead({
        data: {
          full_name: name,
          company: form.company.trim() || null,
          email,
          phone,
          scale: form.scale || null,
          project_name: form.message.trim() || null,
          source: "landing_demo_section",
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }
      setSubmitted(true);
      toast.success("Đã nhận đăng ký demo", {
        description: "STOS sẽ liên hệ với bạn trong 24 giờ làm việc.",
      });
      setForm({ full_name: "", company: "", email: "", phone: "", scale: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error("Không thể gửi đăng ký, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="demo" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
        <div className="lg:col-span-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Đăng ký demo
          </span>
          <h2 className="stos-h1 mt-6" style={{ color: "hsl(var(--brand-navy))" }}>
            Trải nghiệm STOS <span style={{ color: "hsl(221 83% 53%)" }}>trong 30 phút</span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground leading-relaxed">
            Đội ngũ STOS sẽ liên hệ trong 24 giờ làm việc, demo trực tiếp Command Center, STOS Guard và STOS Life theo nhu cầu của bạn.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground/80">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Tư vấn miễn phí 1-1 với chuyên gia vận hành.</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Tài khoản dùng thử với dữ liệu mẫu.</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Lộ trình triển khai trong 14 ngày.</li>
          </ul>
        </div>

        <form onSubmit={onSubmit} className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Họ và tên *" icon={<User className="h-3.5 w-3.5" />}>
              <input required value={form.full_name} onChange={update("full_name")} maxLength={120}
                className="stos-input" placeholder="Nguyễn Văn A" />
            </Field>
            <Field label="Công ty / BQL" icon={<Building className="h-3.5 w-3.5" />}>
              <input value={form.company} onChange={update("company")} maxLength={200}
                className="stos-input" placeholder="Công ty Bảo vệ ABC" />
            </Field>
            <Field label="Email *" icon={<Mail className="h-3.5 w-3.5" />}>
              <input required type="email" value={form.email} onChange={update("email")} maxLength={200}
                className="stos-input" placeholder="ban@congty.vn" />
            </Field>
            <Field label="Số điện thoại *" icon={<Phone className="h-3.5 w-3.5" />}>
              <input required type="tel" value={form.phone} onChange={update("phone")} maxLength={30}
                className="stos-input" placeholder="+84 ..." />
            </Field>
            <Field label="Quy mô vận hành" icon={<Users className="h-3.5 w-3.5" />}>
              <select value={form.scale} onChange={update("scale")} className="stos-input">
                <option value="">Chọn quy mô</option>
                <option value="<50">Dưới 50 nhân sự</option>
                <option value="50-200">50 – 200 nhân sự</option>
                <option value="200-1000">200 – 1.000 nhân sự</option>
                <option value=">1000">Trên 1.000 nhân sự</option>
              </select>
            </Field>
            <Field label="Toà nhà / dự án quan tâm">
              <input value={form.message} onChange={update("message")} maxLength={200}
                className="stos-input" placeholder="VD: Vinhomes Smart City, 12 toà…" />
            </Field>
          </div>

          {submitted && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm" style={{ borderColor: "hsl(160 60% 40% / 0.3)", background: "hsl(160 60% 40% / 0.06)", color: "hsl(160 60% 28%)" }}>
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Đã gửi thành công! STOS sẽ liên hệ với bạn trong 24 giờ làm việc.</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground max-w-xs">
              Bằng cách gửi, bạn đồng ý cho STOS liên hệ tư vấn theo thông tin đã cung cấp.
            </p>
            <button type="submit" disabled={isSubmitting}
              className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--grad-electric)" }}>
              {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…</>) : (<>Gửi đăng ký <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        {icon}{label}
      </span>
      {children}
    </label>
  );
}

/* ──────────── FOOTER ──────────── */
function Footer() {
  return (
    <footer className="border-t border-border bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--grad-navy)" }}>
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold" style={{ color: "hsl(var(--brand-navy))" }}>STOS</span>
            </div>
            <p className="mt-3 text-muted-foreground">Hệ điều hành cho cuộc sống chung cư. Sản xuất tại Việt Nam.</p>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Sản phẩm</div>
            <ul className="mt-3 space-y-2 text-foreground/80">
              <li>STOS Life</li><li>STOS Guard</li><li>Command Center</li><li>Farm Fresh</li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Công ty</div>
            <ul className="mt-3 space-y-2 text-foreground/80">
              <li>Về chúng tôi</li><li>Đối tác</li><li>Tuyển dụng</li><li>Báo chí</li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Liên hệ</div>
            <ul className="mt-3 space-y-2 text-foreground/80">
              <li>hello@stos.vn</li><li>+84 24 9999 8888</li><li>Hà Nội · TP.HCM</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 STOS. Bảo lưu mọi quyền.</span>
          <span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Tiếng Việt</span>
        </div>
      </div>
    </footer>
  );
}

/* ──────────── PAGE ──────────── */
/* ──────────── BQL SUITE — Ban quản lý dự án chung cư ──────────── */
function BqlSuite() {
  const modules = [
    {
      icon: Users,
      title: "Cư dân & căn hộ",
      desc: "Hồ sơ cư dân, chủ hộ, người thuê, thành viên gia đình. Quản lý theo block, tầng, căn hộ với trạng thái đang ở / đã chuyển.",
      points: ["Đồng bộ với hệ thống thẻ", "Lịch sử chuyển nhượng", "Phân quyền theo vai trò"],
    },
    {
      icon: Wrench,
      title: "Yêu cầu dịch vụ",
      desc: "Cư dân gửi yêu cầu sửa chữa, vệ sinh, hỗ trợ. BQL phân công, theo dõi SLA, đóng phiếu kèm ảnh nghiệm thu.",
      points: ["Phân công tự động", "SLA theo mức ưu tiên", "Phản hồi 2 chiều"],
    },
    {
      icon: ReceiptText,
      title: "Phí & thu chi",
      desc: "Quản lý phí dịch vụ, gửi xe, điện nước. Lập hoá đơn hàng kỳ, đối soát thanh toán, xuất báo cáo công nợ.",
      points: ["Hoá đơn tự động", "Thanh toán online", "Đối soát realtime"],
    },
    {
      icon: Bell,
      title: "Thông báo & sự kiện",
      desc: "Phát thông báo theo block / tầng / toàn dự án. Lên lịch sự kiện cộng đồng, khảo sát ý kiến cư dân.",
      points: ["Push notification", "Lịch sự kiện", "Khảo sát & vote"],
    },
    {
      icon: ShieldCheck,
      title: "Phê duyệt khách & xe",
      desc: "Cư dân đăng ký khách / xe ra vào. Bảo vệ kiểm tra bằng QR, BQL giám sát ra vào theo thời gian thực.",
      points: ["QR check-in", "Lịch sử ra vào", "Cảnh báo bất thường"],
    },
    {
      icon: Activity,
      title: "Bảo trì tài sản",
      desc: "Sổ tài sản kỹ thuật: thang máy, PCCC, máy bơm. Lịch bảo trì định kỳ, nhật ký sự cố, cảnh báo hết hạn.",
      points: ["Lịch bảo trì", "Nhật ký kỹ thuật", "Cảnh báo hết hạn"],
    },
  ];

  return (
    <section id="bql" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="stos-chip"><Building2 className="h-3.5 w-3.5" /> Dành cho Ban Quản Lý</span>
          <h2 className="stos-h2 mt-5">
            Bộ công cụ <span style={{ color: "hsl(var(--brand-electric))" }}>vận hành chung cư</span> toàn diện
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Từ hồ sơ cư dân, yêu cầu dịch vụ tới phí quản lý, an ninh và bảo trì kỹ thuật — tất cả trong một workspace duy nhất cho Ban Quản Lý dự án.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <div key={m.title} className="group rounded-2xl border border-border bg-white p-6 hover:shadow-lg transition-shadow">
              <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--grad-navy)" }}>
                <m.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-5 text-lg font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {m.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-foreground/70">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--brand-electric))" }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div id="bql-demo" className="mt-12 grid lg:grid-cols-5 gap-6 lg:gap-8 rounded-2xl border border-border p-6 sm:p-8" style={{ background: "linear-gradient(180deg,hsl(220 30% 98%),#fff)" }}>
          <div className="lg:col-span-2">
            <span className="stos-chip"><Sparkles className="h-3.5 w-3.5" /> Đặt lịch demo BQL</span>
            <h3 className="mt-4 text-2xl font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>
              30 phút để thấy toàn bộ vận hành chung cư của bạn được số hoá
            </h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Để lại thông tin, chuyên gia STOS sẽ liên hệ trong 24 giờ làm việc và demo trực tiếp module Cư dân, Yêu cầu dịch vụ, Phí và Bảo trì theo dự án của bạn.
            </p>
            <div className="mt-5 flex gap-3">
              <Link to="/bql" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--grad-navy)" }}>
                Mở workspace BQL <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                Form đầy đủ
              </Link>
            </div>
          </div>
          <div className="lg:col-span-3">
            <BqlLeadForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function BqlLeadForm() {
  const [form, setForm] = useState({ full_name: "", company: "", email: "", phone: "", project_name: "", scale: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) return toast.error("Vui lòng nhập họ tên, email và số điện thoại");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Email không hợp lệ");
    setBusy(true);
    try {
      const res = await submitDemoLead({
        data: {
          full_name: name,
          company: form.company.trim() || null,
          email,
          phone,
          project_name: form.project_name.trim() || null,
          scale: form.scale || null,
          role: "bql",
          source: "landing_bql_section",
        },
      });
      if (!res.ok) { toast.error(res.error); return; }
      setDone(true);
      toast.success("Đã nhận yêu cầu demo BQL", { description: "STOS sẽ liên hệ trong 24 giờ làm việc." });
      setForm({ full_name: "", company: "", email: "", phone: "", project_name: "", scale: "" });
    } catch {
      toast.error("Không thể gửi, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Họ tên *" icon={<User className="h-3.5 w-3.5" />}>
          <input required value={form.full_name} onChange={upd("full_name")} maxLength={120} className="stos-input" placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="BQL / Công ty" icon={<Building className="h-3.5 w-3.5" />}>
          <input value={form.company} onChange={upd("company")} maxLength={160} className="stos-input" placeholder="BQL toà nhà ..." />
        </Field>
        <Field label="Email *" icon={<Mail className="h-3.5 w-3.5" />}>
          <input required type="email" value={form.email} onChange={upd("email")} maxLength={255} className="stos-input" placeholder="ban@example.vn" />
        </Field>
        <Field label="Điện thoại *" icon={<Phone className="h-3.5 w-3.5" />}>
          <input required type="tel" value={form.phone} onChange={upd("phone")} maxLength={40} className="stos-input" placeholder="+84 ..." />
        </Field>
        <Field label="Tên dự án" icon={<Building2 className="h-3.5 w-3.5" />}>
          <input value={form.project_name} onChange={upd("project_name")} maxLength={200} className="stos-input" placeholder="VD: Vinhomes Smart City" />
        </Field>
        <Field label="Quy mô căn hộ" icon={<Users className="h-3.5 w-3.5" />}>
          <select value={form.scale} onChange={upd("scale")} className="stos-input">
            <option value="">Chọn quy mô</option>
            <option value="<200">Dưới 200 căn</option>
            <option value="200-1000">200 – 1.000 căn</option>
            <option value="1000-5000">1.000 – 5.000 căn</option>
            <option value=">5000">Trên 5.000 căn</option>
          </select>
        </Field>
      </div>

      {done && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "hsl(160 60% 40% / 0.3)", background: "hsl(160 60% 40% / 0.06)", color: "hsl(160 60% 28%)" }}>
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Đã gửi! STOS sẽ liên hệ trong 24 giờ làm việc.</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-[260px]">Bằng việc gửi, bạn đồng ý cho STOS liên hệ tư vấn.</p>
        <button type="submit" disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          style={{ background: "var(--grad-electric)" }}>
          {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…</>) : (<>Đặt lịch demo <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </div>
    </form>
  );
}

/* ──────────── BQL CASE STUDY ──────────── */
/* ──────────── BQL FAQ ──────────── */
function BqlFaq() {
  const groups = [
    {
      icon: ShieldCheck,
      title: "Phân quyền & vai trò",
      items: [
        {
          q: "STOS hỗ trợ những vai trò nào trong BQL?",
          a: "5 vai trò chuẩn: SaaS Admin (vận hành nền tảng), Tenant Admin (chủ đầu tư), BQL Manager (trưởng BQL), BQL Staff (nhân viên), Family Owner / Member (cư dân). Mỗi vai trò có RLS riêng — dữ liệu của dự án A không bao giờ rò sang dự án B.",
        },
        {
          q: "Một nhân sự có thể quản lý nhiều dự án không?",
          a: "Có. Bạn cấp role `bql_manager` hoặc `bql_staff` cho từng `project_id`. Khi đăng nhập, người dùng chọn dự án trong header workspace BQL và toàn bộ dữ liệu được lọc tự động theo dự án đang chọn.",
        },
        {
          q: "Cư dân có thấy dữ liệu của căn hộ khác không?",
          a: "Không. RLS chỉ cho phép thành viên gia đình thấy hồ sơ căn hộ, yêu cầu dịch vụ và phí của chính gia đình mình.",
        },
      ],
    },
    {
      icon: Wrench,
      title: "SLA yêu cầu dịch vụ",
      items: [
        {
          q: "SLA mặc định cho từng mức ưu tiên là bao nhiêu?",
          a: "Khẩn cấp: phản hồi ≤ 5 phút, xử lý ≤ 2 giờ. Cao: ≤ 30 phút / 8 giờ. Bình thường: ≤ 2 giờ / 24 giờ. Thấp: ≤ 1 ngày / 3 ngày. BQL có thể tuỳ biến SLA theo từng nhóm dịch vụ.",
        },
        {
          q: "Phiếu yêu cầu được phân công như thế nào?",
          a: "Tự động theo nhóm kỹ thuật phụ trách (điện, nước, vệ sinh, an ninh) và ca trực hiện tại. Trưởng BQL có thể chuyển phân công thủ công bất cứ lúc nào.",
        },
        {
          q: "Cư dân có theo dõi được tiến độ không?",
          a: "Có. Mỗi thay đổi trạng thái (mở → đang xử lý → chờ nghiệm thu → đóng) đẩy push notification và xuất hiện trong timeline phiếu, kèm ảnh trước/sau khi đóng phiếu.",
        },
      ],
    },
    {
      icon: ReceiptText,
      title: "Đối soát phí",
      items: [
        {
          q: "STOS phát hành hoá đơn phí dịch vụ thế nào?",
          a: "Hoá đơn được sinh tự động theo chu kỳ (tháng/quý) dựa trên diện tích, số xe, đồng hồ điện/nước. Cư dân nhận hoá đơn trong app, BQL xuất file Excel/PDF kèm chữ ký số khi cần.",
        },
        {
          q: "Hỗ trợ phương thức thanh toán nào?",
          a: "VietQR (chuyển khoản tự động đối soát theo nội dung), thẻ ATM/Visa qua cổng thanh toán nội địa, và ghi nhận tiền mặt tại quầy. Đối soát realtime, không cần Excel cuối tháng.",
        },
        {
          q: "Báo cáo công nợ và doanh thu có sẵn không?",
          a: "Có. Dashboard BQL hiển thị công nợ theo căn hộ/block, lịch sử thu, top căn hộ chậm phí, doanh thu theo loại phí. Xuất Excel/PDF cho ban giám đốc bất cứ lúc nào.",
        },
      ],
    },
    {
      icon: QrCode,
      title: "Phê duyệt khách & xe",
      items: [
        {
          q: "Quy trình đăng ký khách của cư dân thế nào?",
          a: "Cư dân đăng ký khách trong app (tên, giờ, lý do, biển số xe nếu có) → hệ thống sinh mã QR gửi qua Zalo/SMS cho khách → bảo vệ quét QR tại cổng, nhật ký ra/vào ghi nhận realtime.",
        },
        {
          q: "Khách không hẹn trước thì xử lý ra sao?",
          a: "Bảo vệ tạo phiếu khách vãng lai trên app, push notification đến cư dân để duyệt trong 60 giây. Nếu hết thời gian, phiếu được chuyển cho BQL trực ca quyết định.",
        },
        {
          q: "Xe ra vào quản lý ra sao?",
          a: "Tích hợp barrier + camera nhận diện biển số. Xe đã đăng ký mở tự động; xe lạ tạo phiếu chờ duyệt. Mỗi giao dịch ra/vào kèm ảnh biển số để tra cứu khi có tranh chấp.",
        },
      ],
    },
  ];

  return (
    <section id="bql-faq" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="stos-chip"><MessageCircle className="h-3.5 w-3.5" /> Câu hỏi thường gặp</span>
          <h2 className="stos-h2 mt-5">
            BQL cần biết gì <span style={{ color: "hsl(var(--brand-electric))" }}>trước khi triển khai?</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Tổng hợp các câu hỏi thường gặp về phân quyền, SLA xử lý yêu cầu, đối soát phí và quy trình phê duyệt khách & xe.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          {groups.map((g) => (
            <div key={g.title} className="rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--grad-navy)" }}>
                  <g.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <h3 className="text-base font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>{g.title}</h3>
              </div>
              <div className="mt-4 divide-y divide-border">
                {g.items.map((it, i) => (
                  <FaqItem key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ background: "linear-gradient(180deg,hsl(220 30% 98%),#fff)" }}>
          <p className="text-sm text-muted-foreground">
            Còn câu hỏi khác cho dự án của bạn? Chuyên gia STOS sẵn sàng tư vấn 1-1.
          </p>
          <div className="flex gap-3">
            <a href="#bql-demo" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--grad-navy)" }}>
              Đặt lịch demo <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
              Form đầy đủ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronRight
          className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

function BqlCaseStudy() {
  const heroStats = [
    { v: "−42%", l: "Thời gian xử lý yêu cầu", c: "var(--brand-electric)" },
    { v: "+96%", l: "Tỷ lệ thu phí đúng hạn", c: "var(--brand-success)" },
    { v: "−58%", l: "Khiếu nại lặp lại", c: "hsl(28 92% 56%)" },
    { v: "4.8/5", l: "Hài lòng cư dân", c: "hsl(258 70% 55%)" },
  ];

  const modules = [
    {
      icon: Users,
      title: "Cư dân & căn hộ",
      before: "Excel rời rạc, dữ liệu lệch giữa lễ tân và BQL",
      after: "Một hồ sơ duy nhất, đồng bộ thẻ ra vào & app cư dân",
      metric: { v: "100%", l: "Căn hộ được số hoá trong 21 ngày" },
    },
    {
      icon: Wrench,
      title: "Yêu cầu dịch vụ",
      before: "Cư dân gọi điện, ghi sổ tay, mất phiếu",
      after: "Tạo phiếu qua app, phân công tự động theo SLA",
      metric: { v: "−42%", l: "Thời gian xử lý trung bình" },
    },
    {
      icon: ReceiptText,
      title: "Phí & thu chi",
      before: "In hoá đơn giấy, đối soát cuối tháng mất 3 ngày",
      after: "Hoá đơn tự động + thanh toán online, đối soát realtime",
      metric: { v: "+96%", l: "Tỷ lệ thu phí đúng hạn" },
    },
    {
      icon: ShieldCheck,
      title: "Phê duyệt khách & xe",
      before: "Bảo vệ ghi sổ, không có lịch sử tra cứu",
      after: "QR check-in, nhật ký realtime cho BQL & cư dân",
      metric: { v: "−65%", l: "Thời gian khách chờ ở lễ tân" },
    },
    {
      icon: Activity,
      title: "Bảo trì tài sản",
      before: "Nhật ký giấy, hay quên lịch bảo trì định kỳ",
      after: "Cảnh báo tự động, lịch sử thiết bị đầy đủ",
      metric: { v: "0", l: "Sự cố thang máy do trễ bảo trì" },
    },
    {
      icon: Bell,
      title: "Thông báo & cộng đồng",
      before: "Dán bảng tin, gửi Zalo nhóm, dễ bỏ sót",
      after: "Push theo block/tầng, đo lường tỷ lệ đọc",
      metric: { v: "92%", l: "Tỷ lệ cư dân đọc thông báo BQL" },
    },
  ];

  return (
    <section id="case-study" className="py-24 sm:py-32" style={{ background: "linear-gradient(180deg,#fff,hsl(220 30% 98%))" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="stos-chip"><Trophy className="h-3.5 w-3.5" /> Case study triển khai</span>
          <h2 className="stos-h2 mt-5">
            Vinhomes Riverside — <span style={{ color: "hsl(var(--brand-electric))" }}>8 toà · 2.460 căn hộ</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            BQL triển khai STOS trong 14 ngày, số hoá toàn bộ hồ sơ cư dân, yêu cầu dịch vụ và phí quản lý.
            Sau 90 ngày vận hành, các chỉ số then chốt đều cải thiện rõ rệt.
          </p>
        </div>

        {/* hero stats */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {heroStats.map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-white p-5">
              <div className="text-3xl sm:text-4xl font-bold tabular-nums" style={{ color: `hsl(${s.c})` }}>{s.v}</div>
              <div className="mt-1.5 text-xs text-muted-foreground leading-snug">{s.l}</div>
            </div>
          ))}
        </div>

        {/* module before / after */}
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <div key={m.title} className="rounded-2xl border border-border bg-white p-6 flex flex-col">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--grad-navy)" }}>
                  <m.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <h3 className="text-base font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>{m.title}</h3>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "hsl(0 78% 56%)" }} />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Trước</div>
                    <div className="text-foreground/80">{m.before}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--brand-success))" }} />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Sau khi dùng STOS</div>
                    <div className="text-foreground/90 font-medium">{m.after}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums" style={{ color: "hsl(var(--brand-electric))" }}>{m.metric.v}</span>
                <span className="text-xs text-muted-foreground">{m.metric.l}</span>
              </div>
            </div>
          ))}
        </div>

        {/* quote */}
        <div className="mt-14 rounded-2xl border border-border p-6 sm:p-8 grid lg:grid-cols-3 gap-6 items-center" style={{ background: "var(--grad-navy)" }}>
          <div className="lg:col-span-2 text-white">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(199 89% 75%)" }} />
            <blockquote className="mt-3 text-lg sm:text-xl font-medium leading-relaxed">
              "STOS giúp BQL chúng tôi thấy được toàn bộ vận hành theo thời gian thực. Cư dân cảm nhận rõ sự thay đổi —
              từ tốc độ phản hồi yêu cầu đến minh bạch trong thu chi phí dịch vụ."
            </blockquote>
            <div className="mt-4 text-sm text-white/70">
              <strong className="text-white">Ms. Trần Thu Hương</strong> · Trưởng BQL Vinhomes Riverside
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <a href="#bql-demo" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold" style={{ background: "white", color: "hsl(var(--brand-navy))" }}>
              Đặt lịch demo cho dự án của bạn <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Xem form đầy đủ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function InstallQrSection() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://stoslife.lovable.app";
  // Dùng start_url của PWA manifest để QR/link không bị redirect về /login khi chưa đăng nhập
  const familyUrl = useMemo(() => `${origin}/login?source=pwa-family`, [origin]);
  const guardUrl = useMemo(() => `${origin}/login?source=pwa-guard`, [origin]);

  const cards = [
    {
      title: "App Gia đình",
      desc: "Quét QR bằng camera điện thoại để mở và cài app Gia đình lên màn hình chính.",
      url: familyUrl,
      fg: "#2563eb",
      cta: "Mở /gia-dinh",
      icon: Heart,
      tone: "from-blue-50 to-white",
    },
    {
      title: "App Bảo vệ",
      desc: "Dành cho đội ngũ bảo vệ. Quét QR để mở và cài app Bảo vệ trên thiết bị trực.",
      url: guardUrl,
      fg: "#0f172a",
      cta: "Mở /guard",
      icon: ShieldCheck,
      tone: "from-slate-50 to-white",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 mb-3">
            <QrCode className="w-4 h-4" /> Cài đặt nhanh
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Quét QR để cài app</h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Mở camera, quét mã, rồi chọn "Thêm vào màn hình chính" để cài như app gốc.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className={`rounded-3xl border border-slate-200 bg-gradient-to-b ${c.tone} p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm`}
              >
                <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm shrink-0">
                  <Suspense fallback={<div style={{ width: 176, height: 176 }} className="bg-slate-100 rounded-md animate-pulse" />}>
                    <QRCodeSVG
                      value={c.url}
                      size={176}
                      fgColor={c.fg}
                      bgColor="#ffffff"
                      level="M"
                      marginSize={2}
                    />
                  </Suspense>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 text-slate-900 font-semibold text-lg">
                    <Icon className="w-5 h-5" style={{ color: c.fg }} /> {c.title}
                  </div>
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">{c.desc}</p>
                  <a
                    href={c.url}
                    className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-blue-600 hover:underline break-all"
                  >
                    {c.cta} <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          PWA chỉ cài được trên bản đã xuất bản. Mở trên Chrome (Android) hoặc Safari (iOS) → "Thêm vào màn hình chính".
        </p>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <div className="stos-landing min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Positioning />
        <Ecosystem />
        <AnhBaoVe />
        <StosGuard />
        <StosLife />
        <FamilyLife />
        <FarmFresh />
        <Community />
        <CommandCenter />
        <BqlSuite />
        <BqlFaq />
        <BqlCaseStudy />
        <BusinessModel />
        <MobileFirst />
        <Trust />
        <FinalCTA />
        <InstallQrSection />
        <DemoForm />
      </main>
      <Footer />
    </div>
  );
}
