import { useEffect, useId, useRef, useState } from "react";
import { X, Keyboard } from "lucide-react";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";

type Props = {
  active: boolean;
  title?: string;
  hint?: string;
  onScan: (payload: string) => void;
  onClose: () => void;
  manualPlaceholder?: string;
};

export function QrCameraScanner({
  active,
  title = "Quét mã QR",
  hint = "Đưa mã vào khung hình",
  onScan,
  onClose,
  manualPlaceholder = "Nhập hoặc dán mã…",
}: Props) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const doneRef = useRef(false);
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || manual) return;
    doneRef.current = false;
    setCameraError(null);
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decoded) => {
            if (doneRef.current) return;
            doneRef.current = true;
            void scanner.stop().finally(() => onScan(decoded));
          },
          () => {},
        );
      } catch (e) {
        if (!cancelled) {
          setCameraError(
            (e as Error).message || "Không mở được camera. Hãy nhập mã thủ công.",
          );
          setManual(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) void s.stop().catch(() => {});
    };
  }, [active, manual, onScan, regionId]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-navy/95 flex flex-col text-white">
      <header className="flex items-center justify-between px-4 pt-6 pb-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-white/70">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {!manual ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <div
            id={regionId}
            className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-white/20"
          />
          {cameraError && (
            <p className="text-xs text-amber-200 text-center max-w-xs">{cameraError}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="border-white/30 text-white bg-transparent"
            onClick={() => setManual(true)}
          >
            <Keyboard className="h-4 w-4 mr-2" /> Nhập mã thủ công
          </Button>
        </div>
      ) : (
        <div className="flex-1 px-4 flex flex-col gap-4 justify-center max-w-md mx-auto w-full">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={manualPlaceholder}
            className="font-mono text-xs h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            autoFocus
          />
          <Button
            type="button"
            className="bg-brand text-white"
            disabled={!manualCode.trim()}
            onClick={() => onScan(manualCode.trim())}
          >
            Xác nhận
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-white/80"
            onClick={() => {
              setManual(false);
              setCameraError(null);
            }}
          >
            Thử lại camera
          </Button>
        </div>
      )}
    </div>
  );
}
