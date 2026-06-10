import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, Loader2, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachSecurityRequestEvidence } from "@/lib/security-attachments.functions";

const BUCKET = "security-attachments";
const MAX = 10 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf",
];

type Uploaded = { path: string; name: string; size: number; mime: string };

type Props = {
  requestId: string;
  onUploaded?: () => void;
  compact?: boolean;
  label?: string;
};

/** Uploads files to the security-attachments bucket under `<requestId>/`
 *  and records them on the request timeline via attachSecurityRequestEvidence. */
export function AttachmentUploader({ requestId, onUploaded, compact, label }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const record = useServerFn(attachSecurityRequestEvidence);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 10);
    setUploading(true);
    const ok: Uploaded[] = [];
    try {
      for (const file of list) {
        if (file.size > MAX) {
          toast.error(`${file.name}: vượt quá 10MB`);
          continue;
        }
        if (!ALLOWED.includes(file.type)) {
          toast.error(`${file.name}: định dạng không hỗ trợ`);
          continue;
        }
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${requestId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`${file.name}: ${error.message}`);
          continue;
        }
        ok.push({ path, name: file.name, size: file.size, mime: file.type });
      }
      if (ok.length > 0) {
        await record({ data: { id: requestId, files: ok } });
        setPending((prev) => [...prev, ...ok]);
        toast.success(`Đã đính kèm ${ok.length} tệp`);
        onUploaded?.();
      }
    } catch (e) {
      toast.error("Không tải lên được", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className={compact ? "" : "rounded-2xl bg-card border border-border p-4 space-y-3"}>
      {!compact && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label ?? "Đính kèm chứng cứ"}
        </p>
      )}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="w-full h-11 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 border border-dashed border-border"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {uploading ? "Đang tải..." : "Chọn ảnh / PDF"}
      </button>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {pending.length > 0 && (
        <ul className="space-y-1.5">
          {pending.map((f) => (
            <li key={f.path} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{f.name}</span>
              <span className="shrink-0">{Math.round(f.size / 1024)}KB</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">Tối đa 10MB/tệp · JPG, PNG, WEBP, HEIC, PDF</p>
    </div>
  );
}

export { X };
