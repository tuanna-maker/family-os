import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ImagePlus, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createSecurityRequest } from "@/lib/security.functions";
import { getMyContext } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { attachSecurityRequestEvidence } from "@/lib/security-attachments.functions";

const BUCKET = "security-attachments";
const MAX_FILE = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"];

export type SecurityRequestKind =
  | "sos"
  | "fire"
  | "intrusion"
  | "noise"
  | "package"
  | "other";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Mã loại yêu cầu để insert vào DB (enum). */
  requestType: SecurityRequestKind;
  /** Tên hiển thị cho user — vd "Báo cháy", "Vận chuyển hàng hoá · Thang hàng". */
  label: string;
  /** Tên nhóm dịch vụ (tuỳ chọn) — lưu vào payload để BQL biết. */
  serviceGroup?: string;
  /** Tên dịch vụ con (tuỳ chọn) — lưu vào payload để BQL biết. */
  serviceItem?: string;
  /** Mô tả phụ. */
  hint?: string;
};

/**
 * Modal thu thập vị trí + ghi chú trước khi gửi yêu cầu Bảo an.
 * Prefill `apartment` từ family hiện tại của user.
 */
export function SecurityRequestDialog({
  open,
  onOpenChange,
  requestType,
  label,
  serviceGroup,
  serviceItem,
  hint,
}: Props) {
  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: useServerFn(getMyContext),
    staleTime: 5 * 60_000,
    enabled: open,
  });
  const send = useServerFn(createSecurityRequest);
  const recordAttach = useServerFn(attachSecurityRequestEvidence);
  const qc = useQueryClient();

  const [building, setBuilding] = useState("");
  const [apartment, setApartment] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // Prefill khi mở
  useEffect(() => {
    if (!open) return;
    const apt = ctxQ.data?.family?.apartment ?? "";
    setApartment(apt);
    setBuilding("");
    setNote("");
    setFiles([]);
  }, [open, ctxQ.data]);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).slice(0, 10 - files.length).filter((f) => {
      if (f.size > MAX_FILE) { toast.error(`${f.name}: vượt 10MB`); return false; }
      if (!ALLOWED_MIME.includes(f.type)) { toast.error(`${f.name}: định dạng không hỗ trợ`); return false; }
      return true;
    });
    setFiles((prev) => [...prev, ...next]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit() {
    setSending(true);
    try {
      const res = await send({
        data: {
          request_type: requestType,
          building: building.trim() || undefined,
          apartment: apartment.trim() || undefined,
          payload: {
            label,
            service_group: serviceGroup ?? null,
            service_item: serviceItem ?? null,
            note: note.trim() || null,
            submitted_at: new Date().toISOString(),
          },
        },
      });

      // Upload attachments (if any) under the new request id
      if (files.length > 0 && res?.id) {
        const uploaded: Array<{ path: string; name: string; size: number; mime: string }> = [];
        for (const f of files) {
          const ext = f.name.split(".").pop() ?? "bin";
          const path = `${res.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, f, { contentType: f.type, upsert: false });
          if (error) { toast.error(`${f.name}: ${error.message}`); continue; }
          uploaded.push({ path, name: f.name, size: f.size, mime: f.type });
        }
        if (uploaded.length > 0) {
          try { await recordAttach({ data: { id: res.id, files: uploaded } }); } catch (e) {
            toast.error("Không ghi nhận được tệp đính kèm", { description: (e as Error).message });
          }
        }
      }

      await qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(`Đã gửi yêu cầu: ${label}`, {
        description: "Đội bảo an sẽ liên hệ trong ít phút.",
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Không gửi được yêu cầu", { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {hint ?? "Bổ sung vị trí & ghi chú để bảo an xử lý nhanh nhất."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sec-building" className="text-xs">Toà / Block</Label>
              <Input
                id="sec-building"
                placeholder="VD: Block A"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="sec-apartment" className="text-xs">Căn hộ</Label>
              <Input
                id="sec-apartment"
                placeholder="VD: A-1502"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                maxLength={40}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sec-note" className="text-xs">Ghi chú</Label>
            <Textarea
              id="sec-note"
              placeholder="Mô tả thêm (tuỳ chọn)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div>

            <Label className="text-xs">Ảnh / chứng cứ (tuỳ chọn)</Label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={sending || files.length >= 10}
              className="mt-1 w-full h-10 rounded-md border border-dashed border-input bg-muted/40 hover:bg-muted text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
              Đính kèm ảnh / PDF ({files.length}/10)
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => pickFiles(e.target.files)}
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                      className="text-emergency text-[11px] font-semibold"
                    >Xoá</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Tối đa 10MB/tệp · JPG/PNG/WEBP/HEIC/PDF</p>
          </div>
        </div>


        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang gửi…
              </>
            ) : (
              "Gửi yêu cầu"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
