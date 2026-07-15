import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Clock, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SubHeader } from "./guard.check-in";

export const Route = createFileRoute("/guard/check-out")({
  head: () => ({ meta: [{ title: "Kết thúc ca — Bảo vệ" }] }),
  component: CheckOutPage,
});

const CHECKLIST = [
  "Không có sự cố tồn đọng",
  "Đã bàn giao chìa khóa/bộ đàm",
  "Đã hoàn thành tuần tra",
  "Không có yêu cầu đang chờ xử lý",
];

function CheckOutPage() {
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
      <SubHeader title="KẾT THÚC CA (CHECK-OUT)" back="/guard" />

      <section className="px-5 mt-2 flex flex-col items-center">
        <div className="relative h-44 w-44 rounded-full bg-card border-4 border-emergency/30 grid place-items-center mt-4">
          <div className="absolute inset-2 rounded-full border-2 border-emergency/40 animate-pulse" />
          <MapPin className="h-16 w-16 text-emergency" strokeWidth={2.4} />
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
          <p className="mt-2 text-3xl font-bold text-emergency tracking-wider tabular-nums">
            {time}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{date}</p>
        </div>

        <div className="mt-4 rounded-3xl bg-card border border-border p-5">
          <p className="text-sm font-semibold mb-3">Xác nhận kết thúc ca</p>
          <ul className="space-y-2.5">
            {CHECKLIST.map((it) => (
              <li key={it} className="flex items-center gap-2.5">
                <span className="h-5 w-5 rounded bg-success grid place-items-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </span>
                <span className="text-[13px]">{it}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            toast.success("Đã kết thúc ca", { description: `Lúc ${time}` });
            navigate({ to: "/guard" });
          }}
          className="mt-5 w-full h-14 rounded-2xl bg-emergency text-white font-bold tracking-wide shadow-lg active:scale-[0.98] transition"
        >
          XÁC NHẬN KẾT THÚC CA
        </button>
      </section>
    </>
  );
}
