import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Flame, Wrench, Package, Car, MoreHorizontal, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubHeader } from "@/features/guard/SubHeader";
import { createIncident } from "@/lib/guard.functions";

export const Route = createFileRoute("/guard/incident")({
  head: () => ({ meta: [{ title: "Báo sự cố — Bảo vệ" }] }),
  component: IncidentPage,
});

const TYPES = [
  { key: "security", icon: AlertTriangle, label: "An ninh", desc: "Trật tự", color: "text-emergency", bg: "bg-emergency/10" },
  { key: "fire", icon: Flame, label: "PCCC", desc: "Cháy nổ", color: "text-warning", bg: "bg-warning/10" },
  { key: "technical", icon: Wrench, label: "Kỹ thuật", desc: "Hạ tầng", color: "text-brand", bg: "bg-brand/10" },
  { key: "loss", icon: Package, label: "Mất mát", desc: "Tài sản", color: "text-[oklch(0.7_0.16_45)]", bg: "bg-[oklch(0.7_0.16_45)]/10" },
  { key: "traffic", icon: Car, label: "Giao thông", desc: "Xe cộ", color: "text-[oklch(0.65_0.2_295)]", bg: "bg-[oklch(0.65_0.2_295)]/10" },
  { key: "other", icon: MoreHorizontal, label: "Khác", desc: "Khác", color: "text-muted-foreground", bg: "bg-muted/30" },
];

const SEVERITIES = [
  { k: "low", label: "Nhẹ", cls: "bg-success/10 text-success border-success/30" },
  { k: "medium", label: "Vừa", cls: "bg-warning/10 text-warning border-warning/30" },
  { k: "high", label: "Cao", cls: "bg-[oklch(0.65_0.2_45)]/10 text-[oklch(0.65_0.2_45)] border-[oklch(0.65_0.2_45)]/30" },
  { k: "critical", label: "Khẩn", cls: "bg-emergency/10 text-emergency border-emergency/30" },
] as const;

function IncidentPage() {
  const navigate = useNavigate();
  const submit = useServerFn(createIncident);
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");

  const m = useMutation({
    mutationFn: () =>
      submit({
        data: {
          type: type!,
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          severity,
        },
      }),
    onSuccess: () => {
      toast.success("Đã gửi báo cáo sự cố");
      navigate({ to: "/guard" });
    },
    onError: (e: Error) => toast.error(e.message || "Không gửi được"),
  });

  const typeMeta = TYPES.find((t) => t.key === type);

  return (
    <>
      <SubHeader title="BÁO SỰ CỐ" back="/guard" />
      <section className="px-5 mt-4">
        <div className="flex items-center justify-between text-[11px]">
          {["Loại sự cố", "Chi tiết & gửi"].map((s, i) => {
            const idx = (i + 1) as 1 | 2;
            return (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`h-7 w-7 rounded-full grid place-items-center text-xs font-bold ${
                    step >= idx ? "bg-brand text-white" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {idx}
                </span>
                <span className={step >= idx ? "font-semibold" : "text-muted-foreground"}>{s}</span>
              </div>
            );
          })}
        </div>
      </section>

      {step === 1 && (
        <section className="px-5 mt-6">
          <p className="text-sm font-semibold mb-3">Chọn loại sự cố</p>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map(({ key, icon: Icon, label, desc, color, bg }) => (
              <button
                key={key}
                onClick={() => {
                  setType(key);
                  setStep(2);
                }}
                className={`rounded-2xl bg-card border p-4 text-center active:scale-[0.98] transition ${
                  type === key ? "border-brand" : "border-border"
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl mx-auto grid place-items-center ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && typeMeta && (
        <section className="px-5 mt-6 space-y-4 pb-10">
          <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl grid place-items-center ${typeMeta.bg}`}>
              <typeMeta.icon className={`h-5 w-5 ${typeMeta.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{typeMeta.label}</p>
              <button onClick={() => setStep(1)} className="text-[11px] text-brand">Đổi loại</button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tiêu đề *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Khói bất thường tầng hầm B1"
              className="mt-1 w-full h-12 rounded-xl bg-card border border-border px-4 text-sm"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Vị trí</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Tầng hầm B1, Tòa A"
              className="mt-1 w-full h-12 rounded-xl bg-card border border-border px-4 text-sm"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Mức độ</label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.k}
                  onClick={() => setSeverity(s.k)}
                  className={`h-10 rounded-xl text-xs font-semibold border ${
                    severity === s.k ? s.cls : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Mô tả chi tiết</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tình huống, người liên quan, hành động đã thực hiện..."
              rows={4}
              className="mt-1 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm"
              maxLength={2000}
            />
          </div>

          <button
            disabled={!title.trim() || m.isPending}
            onClick={() => m.mutate()}
            className="w-full h-14 rounded-2xl bg-emergency text-white font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {m.isPending ? "ĐANG GỬI..." : (<><ArrowRight className="h-5 w-5" /> GỬI BÁO CÁO</>)}
          </button>
        </section>
      )}
    </>
  );
}
