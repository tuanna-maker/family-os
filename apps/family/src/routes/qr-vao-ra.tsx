import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/qr-vao-ra")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "QR ra vào — STOS Life" }] }),
  component: () => (
    <MobileShell>
      <PageHeader
        eyebrow="Resident · Phase 2"
        title="QR ra vào"
        subtitle="QR cá nhân, QR khách thăm, lịch sử ra vào toà nhà."
        emoji="📱"
      />
      <section className="px-4 mt-4">
        <SectionHeader title="Module đang được phát triển" />
        <RoundedCard className="p-5 space-y-2">
          <p className="text-sm font-semibold">Sắp ra mắt</p>
          <p className="text-[12px] text-muted-foreground">
            Tích hợp barrier & camera trong Phase 2.
          </p>
        </RoundedCard>
      </section>
    </MobileShell>
  ),
});
