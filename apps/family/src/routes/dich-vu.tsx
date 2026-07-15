import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Textarea } from "@shared/ui/ui/textarea";
import { requireAuth } from "@/api/require-auth";
import { useFamilyContext } from "@/hooks/use-family-context";
import { createFamilyServiceRequest, listMyServiceRequests } from "@/api/service-requests";
import { listCommunityServices, createServiceBooking } from "@/api/community";
import { toast } from "sonner";

export const Route = createFileRoute("/dich-vu")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Dịch vụ & Tiện ích — STOS Life" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const ticketsQ = useQuery({
    queryKey: ["service-requests", familyId],
    queryFn: () => listMyServiceRequests({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const catalogQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });

  const ticketMut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: title.trim(),
        description: desc.trim() || undefined,
        category: "resident",
        priority: "normal",
      }),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu tới Ban quản lý");
      setTitle("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bookMut = useMutation({
    mutationFn: (serviceId: string) =>
      createServiceBooking({ service_id: serviceId, family_id: familyId! }),
    onSuccess: () => toast.success("Đã đặt dịch vụ — BQL sẽ liên hệ"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Cư dân"
        title="Dịch vụ & Tiện ích"
        subtitle="Gửi yêu cầu BQL hoặc đặt dịch vụ tòa nhà"
        emoji="🛎️"
        back="/home"
      />

      <section className="px-4 mt-4 space-y-4">
        <SectionHeader title="Yêu cầu tới Ban quản lý" />
        <RoundedCard className="p-4 space-y-3">
          <div>
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sửa chữa điều hoà…" />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
          <Button
            className="w-full"
            disabled={!familyId || title.trim().length < 3 || ticketMut.isPending}
            onClick={() => ticketMut.mutate()}
          >
            Gửi yêu cầu
          </Button>
        </RoundedCard>

        {ticketsQ.isLoading ? (
          <LoadingState />
        ) : (ticketsQ.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Yêu cầu của bạn" />
            <div className="space-y-2">
              {ticketsQ.data!.map((t) => (
                <RoundedCard key={t.id} className="p-3">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t.status} · {new Date(t.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </RoundedCard>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="px-4 mt-6">
        <SectionHeader title="Dịch vụ tòa nhà" />
        {catalogQ.isLoading ? (
          <LoadingState />
        ) : (catalogQ.data?.length ?? 0) === 0 ? (
          <EmptyState title="Chưa có catalog" description="BQL sẽ cập nhật danh mục dịch vụ." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {catalogQ.data!.map((s: { id: string; name: string; description: string; icon: string; tag: string | null }) => (
              <RoundedCard key={s.id} className="p-4">
                <div className="text-2xl">{s.icon}</div>
                <p className="text-sm font-semibold mt-2">{s.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={!familyId || bookMut.isPending}
                  onClick={() => bookMut.mutate(s.id)}
                >
                  Đặt
                </Button>
              </RoundedCard>
            ))}
          </div>
        )}
      </section>
    </MobileShell>
  );
}
