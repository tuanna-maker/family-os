import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QrCode, Plus, Copy, Ban, ScanLine } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/ui/ui/dialog";
import { QrCodeImage } from "@/components/QrCodeImage";
import { requireAuth } from "@/api/require-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import { createVisitorPass, listVisitorPasses, revokeVisitorPass } from "@/api/visitor-passes";
import { toast } from "sonner";

export const Route = createFileRoute("/qr-vao-ra")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "QR ra vào — STOS Life" }] }),
  component: QrGuestPage,
});

function QrGuestPage() {
  const navigate = useNavigate();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hours, setHours] = useState("24");
  const [qrPass, setQrPass] = useState<{ pass_code: string; guest_name: string } | null>(null);

  const q = useQuery({
    queryKey: ["visitor-passes", familyId],
    queryFn: () => listVisitorPasses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createVisitorPass({
        family_id: familyId!,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || undefined,
        purpose: purpose.trim() || undefined,
        valid_hours: Number(hours) || 24,
      }),
    onSuccess: (row) => {
      toast.success("Đã tạo mã QR khách");
      setOpen(false);
      setGuestName("");
      setGuestPhone("");
      setPurpose("");
      qc.invalidateQueries({ queryKey: ["visitor-passes"] });
      void navigator.clipboard?.writeText(row.pass_code);
      toast.info("Đã copy mã pass", { description: row.pass_code });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeVisitorPass({ id }),
    onSuccess: () => {
      toast.success("Đã thu hồi mã");
      qc.invalidateQueries({ queryKey: ["visitor-passes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passes = q.data ?? [];

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Bảo an"
        title="QR ra vào"
        subtitle="Tạo mã cho khách đến thăm — bảo vệ quét tại cổng"
        emoji="📱"
        back="/home"
        right={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center"
            aria-label="Tạo mã mới"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <section className="px-4 mt-2">
        <Button
          className="w-full h-11 rounded-2xl bg-brand text-white font-semibold"
          onClick={() =>
            navigate({
              to: "/quet-ma",
              search: { type: "visitor", redirect: "/qr-vao-ra" },
            })
          }
        >
          <ScanLine className="h-5 w-5 mr-2" /> Quét mã khách tại cổng
        </Button>
      </section>

      <section className="px-4 mt-4">
        {famLoading || q.isLoading ? (
          <LoadingState label="Đang tải mã QR…" />
        ) : !familyId ? (
          <EmptyState title="Chưa có hộ gia đình" description="Hoàn tất đăng nhập để tạo mã khách." />
        ) : passes.length === 0 ? (
          <EmptyState
            title="Chưa có mã khách"
            description="Tạo mã QR để khách vào tòa nhà trong thời hạn bạn chọn."
          />
        ) : (
          <div className="space-y-3">
            {passes.map((p) => (
              <RoundedCard key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="h-12 w-12 rounded-2xl bg-tint-blue grid place-items-center shrink-0"
                    onClick={() => p.status === "active" && setQrPass({ pass_code: p.pass_code, guest_name: p.guest_name })}
                  >
                    <QrCode className="h-6 w-6 text-brand" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.guest_name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.pass_code}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Hết hạn {new Date(p.valid_until).toLocaleString("vi-VN")}
                    </p>
                    <span
                      className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === "active" ? "bg-tint-green text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  {p.status === "active" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        className="p-2 rounded-xl border border-border"
                        onClick={() => {
                          void navigator.clipboard?.writeText(p.pass_code);
                          toast.success("Đã copy mã");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-xl border border-border text-emergency"
                        onClick={() => revokeMut.mutate(p.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </RoundedCard>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo mã QR khách</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Tên khách</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </div>
            <div>
              <Label>Mục đích</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Thăm gia đình" />
            </div>
            <div>
              <Label>Hiệu lực (giờ)</Label>
              <Input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button disabled={!guestName.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
              Tạo mã
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrPass} onOpenChange={(o) => !o && setQrPass(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR khách — {qrPass?.guest_name}</DialogTitle>
          </DialogHeader>
          {qrPass && (
            <div className="py-2 space-y-3 text-center">
              <QrCodeImage value={qrPass.pass_code} size={220} />
              <p className="font-mono text-xs text-muted-foreground break-all">{qrPass.pass_code}</p>
              <p className="text-[11px] text-muted-foreground">Khách đưa mã này cho bảo vệ quét tại cổng</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (qrPass) void navigator.clipboard?.writeText(qrPass.pass_code);
                toast.success("Đã copy mã");
              }}
            >
              Copy mã
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
