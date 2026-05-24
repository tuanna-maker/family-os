import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/mobile/MobileShell";
import { StubPage } from "@/components/mobile/StubPage";
import { stubTravel } from "@/features/family-core/stubs";

export const Route = createFileRoute("/du-lich")({
  head: () => ({ meta: [{ title: `${stubTravel.title} — STOS Life` }] }),
  component: () => (
    <MobileShell>
      <StubPage {...stubTravel} />
    </MobileShell>
  ),
});
