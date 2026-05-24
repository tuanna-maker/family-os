import { createFileRoute } from "@tanstack/react-router";
import { SubHeader } from "./guard.check-in";

export const Route = createFileRoute("/guard/requests")({
  head: () => ({ meta: [{ title: "Yêu cầu cư dân — Bảo vệ" }] }),
  component: () => (
    <>
      <SubHeader title="YÊU CẦU CƯ DÂN" back="/guard" />
      <section className="px-5 mt-4 space-y-2">
        {[
          { who: "Căn A-1502", what: "Nhận hàng hộ", time: "2 phút", tone: "bg-brand/10 text-brand" },
          { who: "Căn B-0807", what: "Hỗ trợ kỹ thuật", time: "15 phút", tone: "bg-info/10 text-info" },
          { who: "Căn C-0301", what: "Báo người lạ", time: "1 giờ", tone: "bg-emergency/10 text-emergency" },
        ].map((r) => (
          <div key={r.who + r.what} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{r.who}</p>
              <span className="text-[11px] text-muted-foreground">{r.time}</span>
            </div>
            <span className={`mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full ${r.tone}`}>
              {r.what}
            </span>
          </div>
        ))}
      </section>
    </>
  ),
});
