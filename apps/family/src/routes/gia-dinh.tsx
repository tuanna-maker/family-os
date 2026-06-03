import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import {
  Bell,
  ChevronLeft,
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
} from "lucide-react";
import { cn } from "@shared/utils";
import { getMyContext } from "@/api/auth";
import { getDashboard } from "@/api/dashboard";
import { requireAuth } from "@/api/require-auth";

// Cache constants — context hiếm khi đổi, dashboard refresh nhanh hơn
const CTX_STALE_MS = 5 * 60_000;
const DASH_STALE_MS = 60_000;

export const Route = createFileRoute("/gia-dinh")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Gia đình tôi — STOS Life" }] }),
  component: FamilyPage,
});


const HERO_FAMILY =
  "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=240&h=240&fit=crop&crop=faces&q=70&auto=format";
const AVATAR_FAMILY =
  "https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=80&h=80&fit=crop&crop=faces&q=70&auto=format";

const FOOD_THUMBS = [
  "https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=80&h=80&fit=crop&q=70&auto=format",
  "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop&q=70&auto=format",
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=80&h=80&fit=crop&q=70&auto=format",
];


type Moment = { id: string; title: string; date: string; img: string };
const MOMENTS: Moment[] = [
  {
    id: "1",
    title: "Đà Nẵng – Hội An",
    date: "20/05/2024",
    img: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=280&h=280&fit=crop&q=70&auto=format",
  },
  {
    id: "2",
    title: "Sinh nhật bé An",
    date: "12/05/2024",
    img: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=280&h=280&fit=crop&q=70&auto=format",
  },
  {
    id: "3",
    title: "Bữa cơm cuối tuần",
    date: "05/05/2024",
    img: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=280&h=280&fit=crop&q=70&auto=format",
  },
  {
    id: "4",
    title: "Ngày của mẹ",
    date: "10/05/2024",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=280&h=280&fit=crop&q=70&auto=format",
  },
  {
    id: "5",
    title: "Bé Minh học bài",
    date: "28/04/2024",
    img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=280&h=280&fit=crop&q=70&auto=format",
  },
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

function FamilyPage() {
  // Theme do người dùng quyết định qua Dark/Light toggle toàn cục


      const { data: ctx } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getMyContext(),
    staleTime: CTX_STALE_MS,
  });
  const familyId = ctx?.family?.id;
  const { data: dash } = useQuery({
    queryKey: ["family-dashboard", familyId],
    queryFn: () => getDashboard({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: DASH_STALE_MS,
    refetchOnWindowFocus: false,
  });


  const expCur = dash?.expenses_month.total ?? 0;
  const expPrev = dash?.expenses_prev_month.total ?? 0;
  const expDelta = expPrev > 0 ? ((expCur - expPrev) / expPrev) * 100 : 0;
  const expDown = expDelta <= 0;
  const memberCount = Math.max(dash?.member_count ?? 0, dash?.children.length ?? 0) || 0;

  const foodCount = (dash?.food.expiring_soon ?? 0) + (dash?.food.expired ?? 0);
  const nextMed = dash?.next_medicine;
  const nextAppt = dash?.next_appointment;

  const router = useRouter();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 75;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe) {
      router.navigate({ to: "/home" });
    }
  };

  return (
    <div 
      className="h-full w-full"
      onTouchStart={onTouchStart} 
      onTouchMove={onTouchMove} 
      onTouchEnd={onTouchEnd}
    >
      <MobileShell>
        {/* Top bar */}
        <header className="px-4 pt-3 pb-2 flex items-center gap-3">
          <Link 
            to="/home"
            className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0 active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </Link>
          <h1 className="text-[22px] font-bold tracking-tight">Gia đình tôi</h1>
        </header>

      {/* Hero card */}
      <section className="px-4 mt-1">
        <div className="rounded-[28px] bg-card border border-border p-[18px] shadow-sm relative">
          <button className="absolute top-4 right-4 h-5 w-5 grid place-items-center text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={HERO_FAMILY}
                alt="Gia đình Minh"
                width={112}
                height={112}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-[112px] w-[112px] rounded-full object-cover"
              />
              <button className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-brand grid place-items-center ring-[3px] ring-card">
                <Camera className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0 pt-1.5">
              <div className="flex items-center gap-2 flex-wrap pr-6">
                <h2 className="text-[22px] font-bold leading-none tracking-tight">Gia đình Minh</h2>
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
            <HeroAction icon={Users} label="Thành viên" tint="bg-tint-blue" color="text-brand" to="/tai-khoan" />
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
              icon={Settings}
              label="Cài đặt"
              tint="bg-tint-green"
              color="text-success"
              to="/cai-dat/thong-bao"
            />
          </div>
        </div>
      </section>


      {/* Quản lý gia đình */}
      <section className="px-4 mt-7">
        <h3 className="text-[17px] font-bold mb-3.5 tracking-tight">Quản lý gia đình</h3>
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
          <ServiceTile icon={Car} label="Đặt xe gia đình" tint="bg-tint-orange" color="text-warning" to="/dich-vu" />
          <ServiceTile
            icon={ShoppingCart}
            label="Mua sắm hộ"
            tint="bg-tint-purple"
            color="text-[oklch(0.65_0.2_295)]"
            to="/dich-vu"
          />
          <ServiceTile icon={Crown} label={"Gói dịch vụ\nưu đãi"} tint="bg-tint-orange" color="text-warning" to="/dich-vu" />
        </div>
      </section>

      {/* Khoảnh khắc gia đình */}
      <section className="mt-7 pb-2">
        <div className="px-4 flex items-center justify-between mb-3.5">
          <h3 className="text-[17px] font-bold tracking-tight">Khoảnh khắc gia đình</h3>
          <Link to="/ky-niem-gia-dinh" className="text-[12px] font-semibold text-brand">
            Xem tất cả
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-none">
          {MOMENTS.map((m) => (
            <div key={m.id} className="shrink-0 w-[136px]">
              <div className="h-[136px] w-[136px] rounded-2xl overflow-hidden bg-muted">
                <img
                  src={m.img}
                  alt={m.title}
                  width={136}
                  height={136}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 text-[13px] font-semibold leading-tight truncate">{m.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.date}</p>
            </div>
          ))}
        </div>
      </section>
      </MobileShell>
    </div>
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
