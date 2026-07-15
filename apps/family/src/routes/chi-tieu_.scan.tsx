import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, RotateCcw, Check, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { RoundedCard } from "@shared/ui/common/RoundedCard";
import { scanReceipt, type ScanResult } from "@/api/scan-receipt";
import { createExpense } from "@/api/expenses";
import { getMyContext } from "@/api/auth";
import { formatVND } from "@shared/utils/formatters";
import { supabase } from "@shared/supabase/client";

export const Route = createFileRoute("/chi-tieu_/scan")({
  head: () => ({ meta: [{ title: "Quét hoá đơn — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: ScanPage,
});

type Phase = "capture" | "scanning" | "review" | "saved" | "error";
const CATEGORIES = ["Ăn uống", "Nhà cửa", "Con cái", "Sức khỏe", "Giải trí", "Khác"] as const;

function ScanPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
        const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getMyContext() });
  const familyId = ctxQ.data?.family?.id;

  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleFile = async (file: File) => {
    if (!familyId) {
      setError("Chưa có gia đình. Vui lòng thử lại.");
      setPhase("error");
      return;
    }
    if (file.size > 6_000_000) {
      setError("Ảnh quá lớn (>6MB).");
      setPhase("error");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setPhase("scanning");
    setError("");

    const res = await scanReceipt({ family_id: familyId, imageDataUrl: dataUrl });
    if (!res.ok) {
      setError(res.error);
      setPhase("error");
      return;
    }
    setResult(res.result);
    setPhase("review");
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError("");
    setPhase("capture");
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!result || !familyId) throw new Error("Thiếu dữ liệu");
      await createExpense({
        family_id: familyId,
        title: result.merchant,
        category: result.category,
        amount: result.total,
        spent_on: result.date,
        scan_id: result.scan_id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      setPhase("saved");
      setTimeout(() => navigate({ to: "/chi-tieu" }), 900);
    },
    onError: (e) => {
      setError((e as Error).message);
      setPhase("error");
    },
  });

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/chi-tieu" className="h-9 w-9 rounded-2xl bg-card border border-border grid place-items-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-brand font-semibold">Family Core · Chi tiêu</p>
          <h1 className="text-xl font-bold tracking-tight">Quét hoá đơn</h1>
        </div>
      </header>

      {phase === "capture" && (
        <section className="px-4 space-y-4">
          <RoundedCard className="bg-gradient-to-br from-tint-blue to-tint-purple border-0 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-white grid place-items-center text-3xl shadow-[var(--shadow-soft)]">📸</div>
            <p className="mt-3 text-sm font-semibold">Chụp hoặc tải hoá đơn lên</p>
            <p className="text-xs text-muted-foreground mt-1">AI sẽ tự động đọc cửa hàng, số tiền và phân loại</p>
          </RoundedCard>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl bg-gradient-to-br from-brand to-pink text-white p-4 font-semibold flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] active:scale-[0.98] transition"
          >
            <Camera className="h-5 w-5" /> Chụp hoá đơn
          </button>

          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.removeAttribute("capture");
                fileRef.current.click();
                setTimeout(() => fileRef.current?.setAttribute("capture", "environment"), 100);
              }
            }}
            className="w-full rounded-2xl bg-card border border-border p-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <ImageIcon className="h-5 w-5" /> Chọn từ thư viện
          </button>
        </section>
      )}

      {phase === "scanning" && preview && (
        <section className="px-4 space-y-4">
          <div className="relative rounded-3xl overflow-hidden border border-border">
            <img src={preview} alt="Hoá đơn" className="w-full h-72 object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-b from-brand/10 to-navy/40 grid place-items-center">
              <div className="bg-white/95 dark:bg-card rounded-2xl px-5 py-4 flex items-center gap-3 shadow-[var(--shadow-pop)]">
                <Loader2 className="h-5 w-5 text-brand animate-spin" />
                <div>
                  <p className="text-sm font-semibold">AI đang đọc hoá đơn…</p>
                  <p className="text-[11px] text-muted-foreground">Khoảng 3–8 giây</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "review" && result && (
        <section className="px-4 space-y-4">
          {preview && (
            <img src={preview} alt="Hoá đơn" className="w-full h-44 object-cover rounded-2xl border border-border" />
          )}
          <RoundedCard className="space-y-3">
            <Field label="Cửa hàng" value={result.merchant} onChange={(v) => setResult({ ...result, merchant: v })} />
            <Field
              label="Số tiền"
              value={String(result.total)}
              suffix="đ"
              type="number"
              onChange={(v) => setResult({ ...result, total: Number(v) || 0 })}
            />
            <Field label="Ngày" value={result.date} onChange={(v) => setResult({ ...result, date: v })} />
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Danh mục</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setResult({ ...result, category: c })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      result.category === c ? "bg-brand text-white border-brand" : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </RoundedCard>

          {result.line_items && result.line_items.length > 0 && (
            <RoundedCard>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Chi tiết ({result.line_items.length} dòng)
              </p>
              <ul className="divide-y divide-border text-sm">
                {result.line_items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between py-2 gap-2">
                    <span className="flex-1 truncate">
                      {it.name}
                      {it.qty && it.qty !== 1 ? (
                        <span className="text-muted-foreground"> × {it.qty}</span>
                      ) : null}
                    </span>
                    <span className="font-medium tabular-nums shrink-0">
                      {it.price ? formatVND(it.price) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </RoundedCard>
          )}

          <div className="rounded-2xl bg-tint-green/60 p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-success" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tổng sẽ ghi nhận</p>
              <p className="text-lg font-bold">{formatVND(result.total)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={reset}
              className="rounded-2xl bg-card border border-border p-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <RotateCcw className="h-4 w-4" /> Quét lại
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-2xl bg-gradient-to-br from-brand to-pink text-white p-4 font-semibold flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] active:scale-[0.98] transition disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu khoản chi
            </button>
          </div>
        </section>
      )}

      {phase === "saved" && (
        <section className="px-4">
          <RoundedCard className="bg-tint-green border-0 text-center py-8">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-success grid place-items-center text-white text-2xl">✓</div>
            <p className="mt-3 font-semibold">Đã lưu vào chi tiêu</p>
            <p className="text-xs text-muted-foreground mt-1">Đang chuyển về danh sách…</p>
          </RoundedCard>
        </section>
      )}

      {phase === "error" && (
        <section className="px-4 space-y-4">
          <RoundedCard className="bg-emergency/10 border-emergency/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-emergency shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Không quét được</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </RoundedCard>
          <button
            onClick={reset}
            className="w-full rounded-2xl bg-card border border-border p-4 font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
        </section>
      )}
    </MobileShell>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
