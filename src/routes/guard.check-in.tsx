import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Info, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/guard/check-in")({
  head: () => ({ meta: [{ title: "Vào ca — Bảo vệ" }] }),
  component: CheckInPage,
});

function CheckInPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("vi-VN", { hour12: false });
  const date = now.toLocaleDateString("vi-VN");

  return (
    <>
      <SubHeader title="VÀO CA (CHECK-IN)" back="/guard" />

      <section className="px-5 mt-2 flex flex-col items-center">
        <div className="relative h-44 w-44 rounded-full bg-card border-4 border-success/30 grid place-items-center mt-4">
          <div className="absolute inset-2 rounded-full border-2 border-success/40 animate-pulse" />
          <MapPin className="h-16 w-16 text-success" strokeWidth={2.4} />
        </div>
        <p className="mt-5 text-success text-base font-semibold">Lấy vị trí thành công</p>
        <p className="text-sm mt-1">Sảnh chính - Tòa A</p>
        <p className="text-[11px] text-muted-foreground">
          35 Lê Văn Lương, Thanh Xuân, Hà Nội
        </p>
      </section>

      <section className="px-5 mt-6">
        <div className="rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-3.5 w-3.5" />
            Thời gian hiện tại
          </div>
          <p className="mt-2 text-3xl font-bold text-success tracking-wider tabular-nums">
            {time}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{date}</p>
        </div>

        <div className="mt-4 rounded-2xl bg-info/10 border border-info/30 p-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80">
            Vui lòng đảm bảo bạn đang ở đúng vị trí làm việc
          </p>
        </div>

        <button
          onClick={() => {
            toast.success("Đã xác nhận vào ca", { description: `Lúc ${time}` });
            navigate({ to: "/guard" });
          }}
          className="mt-5 w-full h-14 rounded-2xl bg-success text-white font-bold tracking-wide shadow-lg active:scale-[0.98] transition"
        >
          XÁC NHẬN VÀO CA
        </button>
      </section>
    </>
  );
}

export function SubHeader({ title, back }: { title: string; back: string }) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-border">
      <Link
        to={back as any}
        className="h-9 w-9 rounded-full bg-card border border-border grid place-items-center"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h1 className="text-sm font-bold tracking-wide uppercase">{title}</h1>
    </header>
  );
}
