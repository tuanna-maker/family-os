import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { requireAuth } from "@/lib/require-auth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import { getMyContext } from "@/lib/auth.functions";
import { Plus, Ban, Copy, Share2 } from "lucide-react";

export const Route = createFileRoute("/qr-vao-ra")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "QR ra vào — STOS Life" }] }),
  loader: ({ context }) => {
    if (typeof window === "undefined") return;
    context.queryClient.prefetchQuery({
      queryKey: ["my-context"],
      queryFn: () => getMyContext(),
      staleTime: 5 * 60_000,
    });
  },
  component: QrPage,
});

type Pass = {
  id: string;
  pass_code: string;
  guest_name: string;
  guest_phone: string | null;
  vehicle_plate: string | null;
  purpose: string | null;
  valid_from: string;
  valid_until: string;
  status: string;
  created_at: string;
};

function QrPage() {
  const { user } = useAuth();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [viewPass, setViewPass] = useState<Pass | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hours, setHours] = useState(24);

  const passesQ = useQuery({
    queryKey: ["visitor-passes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitor_passes")
        .select("id,pass_code,guest_name,guest_phone,vehicle_plate,purpose,valid_from,valid_until,status,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Pass[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Cần đăng nhập");
      if (!name.trim()) throw new Error("Nhập tên khách");
      const validUntil = new Date(Date.now() + hours * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("visitor_passes")
        .insert({
          host_user_id: user.id,
          family_id: familyId ?? null,
          guest_name: name.trim(),
          guest_phone: phone.trim() || null,
          vehicle_plate: plate.trim() || null,
          purpose: purpose.trim() || null,
          valid_until: validUntil,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Pass;
    },
    onSuccess: (pass) => {
      toast.success("Đã tạo QR khách");
      qc.invalidateQueries({ queryKey: ["visitor-passes"] });
      setCreateOpen(false);
      setName("");
      setPhone("");
      setPlate("");
      setPurpose("");
      setHours(24);
      setViewPass(pass);
    },
    onError: (e: Error) => toast.error("Tạo QR thất bại", { description: e.message }),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("visitor_passes")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã thu hồi QR");
      qc.invalidateQueries({ queryKey: ["visitor-passes"] });
    },
    onError: (e: Error) => toast.error("Thu hồi thất bại", { description: e.message }),
  });

  const myQrPayload = user ? `STOS:RESIDENT:${user.id}` : "";

  const isExpired = (p: Pass) =>
    p.status === "expired" || (p.status === "active" && new Date(p.valid_until) < new Date());
  const statusBadge = (p: Pass) => {
    if (p.status === "revoked") return { label: "Đã thu hồi", cls: "bg-muted text-muted-foreground" };
    if (p.status === "used") return { label: "Đã dùng", cls: "bg-blue-50 text-blue-600" };
    if (isExpired(p)) return { label: "Hết hạn", cls: "bg-muted text-muted-foreground" };
    return { label: "Đang hoạt động", cls: "bg-green-50 text-green-600" };
  };

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Resident"
        title="QR ra vào"
        subtitle="QR cá nhân & QR khách thăm toà nhà."
        emoji="📱"
      />

      <section className="px-4 mt-2">
        <SectionHeader title="QR cá nhân" />
        <RoundedCard className="flex items-center gap-4 p-4">
          <div className="bg-white rounded-xl p-2 shrink-0">
            {myQrPayload ? (
              <QRCodeSVG value={myQrPayload} size={88} level="M" />
            ) : (
              <div className="h-[88px] w-[88px] bg-muted animate-pulse rounded" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Quét tại cổng để ra vào</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Mã cố định gắn với tài khoản cư dân của bạn.
            </p>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="QR khách thăm" />
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-brand"
          >
            <Plus className="h-4 w-4" /> Tạo mới
          </button>
        </div>

        {passesQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (passesQ.data?.length ?? 0) === 0 ? (
          <RoundedCard className="p-5 text-center text-xs text-muted-foreground">
            Chưa có QR khách nào. Bấm "Tạo mới" để cấp QR cho người thân/khách.
          </RoundedCard>
        ) : (
          <div className="space-y-2">
            {passesQ.data!.map((p) => {
              const s = statusBadge(p);
              return (
                <RoundedCard key={p.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setViewPass(p)}
                      className="bg-white rounded-lg p-1 shrink-0 border border-border"
                    >
                      <QRCodeSVG value={`STOS:GUEST:${p.pass_code}`} size={48} level="M" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Hết hạn {new Date(p.valid_until).toLocaleString("vi-VN")}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {p.status === "active" && !isExpired(p) && (
                      <button
                        onClick={() => revokeMut.mutate(p.id)}
                        disabled={revokeMut.isPending}
                        className="text-muted-foreground active:text-emergency shrink-0 p-2"
                        aria-label="Thu hồi"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </RoundedCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Create QR dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo QR khách thăm</DialogTitle>
            <DialogDescription>
              QR có thời hạn, dùng một lần tại cổng. Có thể thu hồi bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tên khách *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Điện thoại</label>
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Biển số xe</label>
                <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="51A-12345" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hiệu lực (giờ)</label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={hours}
                  onChange={(e) => setHours(Math.max(1, Math.min(168, +e.target.value || 24)))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mục đích</label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Thăm gia đình, giao hàng..." />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border"
            >
              Huỷ
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !name.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white disabled:opacity-50"
            >
              {createMut.isPending ? "Đang tạo..." : "Tạo QR"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View QR dialog */}
      <Dialog open={!!viewPass} onOpenChange={(o) => !o && setViewPass(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR cho {viewPass?.guest_name}</DialogTitle>
            <DialogDescription>
              Hết hạn {viewPass && new Date(viewPass.valid_until).toLocaleString("vi-VN")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {viewPass && (
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={`STOS:GUEST:${viewPass.pass_code}`} size={220} level="M" />
              </div>
            )}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => {
                  if (!viewPass) return;
                  navigator.clipboard.writeText(viewPass.pass_code);
                  toast.success("Đã sao chép mã");
                }}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl border border-border"
              >
                <Copy className="h-3.5 w-3.5" /> Sao chép mã
              </button>
              <button
                onClick={async () => {
                  if (!viewPass) return;
                  const text = `QR khách STOS Life cho ${viewPass.guest_name}\nMã: ${viewPass.pass_code}\nHết hạn: ${new Date(viewPass.valid_until).toLocaleString("vi-VN")}`;
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: "QR khách thăm", text });
                    } else {
                      await navigator.clipboard.writeText(text);
                      toast.success("Đã sao chép thông tin QR");
                    }
                  } catch {
                    /* user cancelled */
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl bg-brand text-white"
              >
                <Share2 className="h-3.5 w-3.5" /> Chia sẻ
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Mã: {viewPass?.pass_code.slice(0, 16)}...</p>
          </div>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
