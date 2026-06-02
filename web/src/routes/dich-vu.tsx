import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { requireAuth } from "@/lib/require-auth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import { Clock, CheckCircle2, XCircle, Loader2, X } from "lucide-react";

type SvcSearch = { service?: string };

export const Route = createFileRoute("/dich-vu")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  validateSearch: (s: Record<string, unknown>): SvcSearch => ({
    service: typeof s.service === "string" ? s.service : undefined,
  }),
  head: () => ({ meta: [{ title: "Dịch vụ & Tiện ích — STOS Life" }] }),
  component: ServicesPage,
});

type Svc = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string | null;
  category: string | null;
};
type Booking = {
  id: string;
  service_id: string;
  status: string;
  scheduled_at: string | null;
  notes: string | null;
  created_at: string;
  community_services: { name: string; icon: string } | null;
};

function ServicesPage() {
  const { service: presetServiceId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const [openSvc, setOpenSvc] = useState<Svc | null>(null);
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  const servicesQ = useQuery({
    queryKey: ["community-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_services")
        .select("id,name,description,icon,tag,category")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Svc[];
    },
  });

  const bookingsQ = useQuery({
    queryKey: ["service-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("id,service_id,status,scheduled_at,notes,created_at,community_services(name,icon)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
  });

  // Auto-open from query param
  if (presetServiceId && !openSvc && servicesQ.data) {
    const found = servicesQ.data.find((s) => s.id === presetServiceId);
    if (found) {
      setOpenSvc(found);
      navigate({ to: "/dich-vu", search: {}, replace: true });
    }
  }

  const bookMut = useMutation({
    mutationFn: async () => {
      if (!user || !openSvc) throw new Error("Thiếu dữ liệu");
      const { error } = await supabase.from("service_bookings").insert({
        service_id: openSvc.id,
        family_id: familyId ?? null,
        requested_by: user.id,
        contact_phone: phone || null,
        scheduled_at: when ? new Date(when).toISOString() : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu", { description: "BQL sẽ liên hệ xác nhận sớm." });
      qc.invalidateQueries({ queryKey: ["service-bookings"] });
      setOpenSvc(null);
      setPhone("");
      setWhen("");
      setNotes("");
    },
    onError: (e: Error) => toast.error("Gửi yêu cầu thất bại", { description: e.message }),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_bookings")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã huỷ yêu cầu");
      qc.invalidateQueries({ queryKey: ["service-bookings"] });
    },
    onError: (e: Error) => toast.error("Huỷ thất bại", { description: e.message }),
  });

  const statusMap: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: { label: "Chờ xác nhận", cls: "text-amber-600 bg-amber-50", Icon: Clock },
    confirmed: { label: "Đã xác nhận", cls: "text-blue-600 bg-blue-50", Icon: CheckCircle2 },
    in_progress: { label: "Đang thực hiện", cls: "text-blue-600 bg-blue-50", Icon: Loader2 },
    done: { label: "Hoàn tất", cls: "text-green-600 bg-green-50", Icon: CheckCircle2 },
    cancelled: { label: "Đã huỷ", cls: "text-muted-foreground bg-muted", Icon: XCircle },
  };

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Resident"
        title="Dịch vụ & Tiện ích"
        subtitle="Đặt dịch vụ trong toà nhà, theo dõi yêu cầu của hộ."
        emoji="🛎️"
      />

      <section className="px-4 mt-2">
        <SectionHeader title="Chọn dịch vụ" />
        {servicesQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {servicesQ.data?.map((s) => (
              <button key={s.id} onClick={() => setOpenSvc(s)} className="text-left">
                <RoundedCard className="p-4 h-full">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{s.icon}</div>
                    {s.tag && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-tint-blue text-brand">
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
                </RoundedCard>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-7 pb-4">
        <SectionHeader title="Yêu cầu gần đây" />
        {bookingsQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (bookingsQ.data?.length ?? 0) === 0 ? (
          <RoundedCard className="p-5 text-center text-xs text-muted-foreground">
            Chưa có yêu cầu nào. Bấm vào dịch vụ ở trên để đặt.
          </RoundedCard>
        ) : (
          <div className="space-y-2">
            {bookingsQ.data!.map((b) => {
              const s = statusMap[b.status] ?? statusMap.pending;
              return (
                <RoundedCard key={b.id} className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center text-lg shrink-0">
                    {b.community_services?.icon ?? "🛎️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {b.community_services?.name ?? "Dịch vụ"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.scheduled_at
                        ? new Date(b.scheduled_at).toLocaleString("vi-VN")
                        : new Date(b.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 shrink-0 ${s.cls}`}
                  >
                    <s.Icon className="h-3 w-3" /> {s.label}
                  </span>
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <button
                      onClick={() => cancelMut.mutate(b.id)}
                      disabled={cancelMut.isPending}
                      className="text-muted-foreground active:text-emergency shrink-0 p-1"
                      aria-label="Huỷ yêu cầu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </RoundedCard>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={!!openSvc} onOpenChange={(o) => !o && setOpenSvc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{openSvc?.icon}</span>
              <span>{openSvc?.name}</span>
            </DialogTitle>
            <DialogDescription>{openSvc?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Số điện thoại liên hệ
              </label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="VD: 0901 234 567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Thời gian mong muốn
              </label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ghi chú</label>
              <Textarea
                rows={3}
                placeholder="Mô tả thêm yêu cầu của bạn..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpenSvc(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border"
            >
              Huỷ
            </button>
            <button
              onClick={() => bookMut.mutate()}
              disabled={bookMut.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white disabled:opacity-50"
            >
              {bookMut.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
