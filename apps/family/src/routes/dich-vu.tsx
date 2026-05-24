import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/dich-vu")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Dịch vụ & Tiện ích — STOS Life" }] }),
  component: () => (
    <MobileShell>
      <PageHeader
        eyebrow="Resident · Phase 2"
        title="Dịch vụ & Tiện ích"
        subtitle="Đặt dịch vụ trong toà nhà: vệ sinh, sửa chữa, đặt phòng tiện ích."
        emoji="🛎️"
      />
      <section className="px-4 mt-4">
        <SectionHeader title="Module đang được phát triển" />
        <RoundedCard className="p-5 space-y-2">
          <p className="text-sm font-semibold">Sắp ra mắt</p>
          <p className="text-[12px] text-muted-foreground">
            Catalog dịch vụ, đặt lịch, thanh toán VietQR sẽ có trong Phase 2.
          </p>
        </RoundedCard>
      </section>
    </MobileShell>
  ),
});
