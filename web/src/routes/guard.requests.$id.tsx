import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Hand, Check, MessageSquarePlus, Clock, MapPin, User, Phone, Paperclip, FileText, Loader2 } from "lucide-react";
import {
  getGuardRequestDetail,
  claimGuardRequest,
  resolveGuardRequest,
  addGuardRequestNote,
} from "@/lib/guard.functions";
import { signSecurityAttachments } from "@/lib/security-attachments.functions";
import { AttachmentUploader } from "@/components/security/AttachmentUploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/guard/requests/$id")({
  head: () => ({ meta: [{ title: "Chi tiết yêu cầu — Bảo vệ" }] }),
  component: RequestDetail,
});

const TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Báo người lạ",
  package: "Nhận hàng hộ",
  noise: "Báo tiếng ồn",
  other: "Yêu cầu khác",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  in_progress: "Đang xử lý",
  resolved: "Hoàn tất",
  cancelled: "Đã huỷ",
};
const STATUS_TONE: Record<string, string> = {
  open: "bg-emergency/15 text-emergency",
  in_progress: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function RequestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getGuardRequestDetail);
  const claim = useServerFn(claimGuardRequest);
  const resolve = useServerFn(resolveGuardRequest);
  const addNote = useServerFn(addGuardRequestNote);
  const [note, setNote] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [confirmClaim, setConfirmClaim] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);

  const q = useQuery({
    queryKey: ["guard-request", id],
    queryFn: () => fetchDetail({ data: { id } }),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["guard-request", id] });
    qc.invalidateQueries({ queryKey: ["guard-requests"] });
  };

  const claimM = useMutation({
    mutationFn: () => claim({ data: { id } }),
    onSuccess: () => { toast.success("Đã nhận xử lý"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const noteM = useMutation({
    mutationFn: (n: string) => addNote({ data: { id, note: n } }),
    onSuccess: () => { toast.success("Đã ghi nhận cập nhật"); setNote(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resolveM = useMutation({
    mutationFn: (n?: string) => resolve({ data: { id, note: n || undefined } }),
    onSuccess: () => {
      toast.success("Đã hoàn tất yêu cầu");
      invalidate();
      navigate({ to: "/guard/requests" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return <p className="px-5 py-10 text-sm text-muted-foreground text-center">Đang tải...</p>;
  }
  if (q.isError || !q.data) {
    return <p className="px-5 py-10 text-sm text-emergency text-center">Không tải được chi tiết</p>;
  }

  const { request, events } = q.data;

  // Collect attachments from event metadata
  const attachments = useMemo(() => {
    const out: Array<{ path: string; name: string; mime: string; size: number }> = [];
    for (const e of events) {
      const arr = (e.metadata as any)?.attachments as Array<any> | undefined;
      if (Array.isArray(arr)) for (const a of arr) if (a?.path) out.push(a);
    }
    return out;
  }, [events]);
  const p = request.payload ?? {};
  const typeLabel = TYPE_LABEL[request.request_type] ?? request.request_type;
  const statusLabel = STATUS_LABEL[request.status] ?? request.status;
  const statusTone = STATUS_TONE[request.status] ?? "bg-muted";
  const who = [request.building, request.apartment].filter(Boolean).join("-") || "Cư dân";
  const label = (p.label as string) ?? null;
  const serviceGroup = (p.service_group as string) ?? null;
  const serviceItem = (p.service_item as string) ?? null;
  const contactName = (p.contact_name as string) ?? null;
  const contactPhone = (p.contact_phone as string) ?? null;
  const location = (p.location as string) ?? null;
  const noteFromResident = (p.note as string) ?? null;
  const ticketCode = (p.ticket_code as string) ?? null;
  const priority = (p.priority as string) ?? null;
  const isOpen = request.status === "open";
  const isInProgress = request.status === "in_progress";
  const isClosed = request.status === "resolved" || request.status === "cancelled";

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 h-12 flex items-center gap-3">
        <Link
          to="/guard/requests"
          className="h-9 w-9 rounded-full grid place-items-center hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-semibold tracking-wider">CHI TIẾT YÊU CẦU</p>
      </header>

      <section className="px-4 mt-4 space-y-3">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {priority && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emergency text-white">
                    {priority}
                  </span>
                )}
                <span className="text-xs font-semibold text-brand">{typeLabel}</span>
              </div>
              <p className="mt-1 text-base font-bold leading-tight">
                {label ?? serviceItem ?? typeLabel}
              </p>
              {serviceGroup && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {serviceGroup}{serviceItem && ` · ${serviceItem}`}
                </p>
              )}
            </div>
            <span className={`text-[11px] px-2 py-1 rounded-full font-semibold shrink-0 ${statusTone}`}>
              {statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {fmtTime(request.created_at)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Căn {who}
            </div>
            {location && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </div>
            )}
          </div>
          {ticketCode && (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">#{ticketCode}</p>
          )}
        </div>

        {(contactName || contactPhone) && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Liên hệ cư dân
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {contactName && <p className="text-sm font-semibold truncate">{contactName}</p>}
                {contactPhone && (
                  <p className="text-[12px] text-muted-foreground">{contactPhone}</p>
                )}
              </div>
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="h-10 px-3 rounded-xl bg-brand text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" /> Gọi
                </a>
              )}
            </div>
          </div>
        )}

        {noteFromResident && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Ghi chú cư dân
            </p>
            <p className="mt-1.5 text-sm whitespace-pre-wrap">{noteFromResident}</p>
          </div>
        )}

        {attachments.length > 0 && (
          <AttachmentGallery attachments={attachments} />
        )}

        {!isClosed && (
          <AttachmentUploader
            requestId={request.id}
            onUploaded={invalidate}
            label="Đính kèm chứng cứ (bảo vệ)"
          />
        )}
      </section>


      {/* Action zone */}
      {!isClosed && (
        <section className="px-4 mt-4">
          {isOpen ? (
            <button
              disabled={claimM.isPending}
              onClick={() => setConfirmClaim(true)}
              className="w-full h-12 rounded-2xl bg-brand text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
            >
              {claimM.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Đang tiếp nhận...</>
              ) : (
                <><Hand className="h-4 w-4" /> Tiếp nhận yêu cầu</>
              )}
            </button>
          ) : (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Cập nhật tiến độ
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả tình hình xử lý hiện tại..."
                rows={3}
                disabled={noteM.isPending}
                className="w-full rounded-xl bg-background border border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
              />
              <button
                disabled={!note.trim() || noteM.isPending}
                onClick={() => noteM.mutate(note.trim())}
                className="w-full h-10 rounded-xl bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {noteM.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi ghi chú...</>
                ) : (
                  <><MessageSquarePlus className="h-4 w-4" /> Thêm ghi chú</>
                )}
              </button>

              <div className="pt-2 border-t border-border space-y-2">
                <input
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Kết quả xử lý (tuỳ chọn)"
                  disabled={resolveM.isPending}
                  className="w-full rounded-xl bg-background border border-border px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-success/30 disabled:opacity-60"
                />
                <button
                  disabled={resolveM.isPending}
                  onClick={() => setConfirmResolve(true)}
                  className="w-full h-12 rounded-2xl bg-success text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
                >
                  {resolveM.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Đang hoàn tất...</>
                  ) : (
                    <><Check className="h-4 w-4" /> Hoàn tất yêu cầu</>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Confirm dialogs */}
      <AlertDialog open={confirmClaim} onOpenChange={setConfirmClaim}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tiếp nhận yêu cầu này?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ trở thành người phụ trách <b>{label ?? typeLabel}</b>
              {ticketCode && <> (#{ticketCode})</>}. Cư dân sẽ nhận thông báo ngay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={claimM.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              disabled={claimM.isPending}
              onClick={(e) => {
                e.preventDefault();
                claimM.mutate(undefined, { onSettled: () => setConfirmClaim(false) });
              }}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {claimM.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Đang nhận...</>
              ) : (
                "Xác nhận tiếp nhận"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmResolve} onOpenChange={setConfirmResolve}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tất yêu cầu này?</AlertDialogTitle>
            <AlertDialogDescription>
              Yêu cầu sẽ chuyển sang trạng thái <b>Đã giải quyết</b> và không thể chỉnh sửa thêm.
              {resolveNote.trim() && (
                <span className="block mt-2 text-foreground">
                  Ghi chú kết quả: <i>{resolveNote.trim()}</i>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolveM.isPending}>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              disabled={resolveM.isPending}
              onClick={(e) => {
                e.preventDefault();
                resolveM.mutate(resolveNote.trim(), {
                  onSettled: () => setConfirmResolve(false),
                });
              }}
              className="bg-success text-white hover:bg-success/90"
            >
              {resolveM.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Đang hoàn tất...</>
              ) : (
                "Xác nhận hoàn tất"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {/* Timeline */}
      <section className="px-4 mt-5 pb-10">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Lịch sử xử lý
        </p>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Chưa có hoạt động</p>
        ) : (
          <ol className="space-y-2">
            {events.map((e: typeof events[number]) => (
              <li key={e.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                    {e.event_type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{fmtTime(e.created_at)}</span>
                </div>
                {e.note && <p className="mt-1 text-[13px] whitespace-pre-wrap">{e.note}</p>}
                {e.to_status && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    → {STATUS_LABEL[e.to_status] ?? e.to_status}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function AttachmentGallery({
  attachments,
}: {
  attachments: Array<{ path: string; name: string; mime: string; size: number }>;
}) {
  const sign = useServerFn(signSecurityAttachments);
  const q = useQuery({
    queryKey: ["sec-attach-sign", attachments.map((a) => a.path).join(",")],
    queryFn: () => sign({ data: { paths: attachments.map((a) => a.path) } }),
    staleTime: 60 * 1000 * 20,
  });
  const urlByPath = new Map((q.data ?? []).map((s) => [s.path, s.url]));

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        Chứng cứ đính kèm ({attachments.length})
      </p>
      <div className="grid grid-cols-3 gap-2">
        {attachments.map((a) => {
          const url = urlByPath.get(a.path);
          const isImg = a.mime.startsWith("image/");
          return (
            <a
              key={a.path}
              href={url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="aspect-square rounded-xl bg-muted border border-border overflow-hidden grid place-items-center relative"
              title={a.name}
            >
              {isImg && url ? (
                <img src={url} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground p-2">
                  <FileText className="h-6 w-6" />
                  <span className="text-[9px] truncate w-full text-center mt-1">{a.name}</span>
                </div>
              )}
              <span className="absolute top-1 right-1 bg-background/80 backdrop-blur rounded p-0.5">
                <Paperclip className="h-3 w-3" />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

