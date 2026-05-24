import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { StubPage } from "@shared/ui/mobile/StubPage";
import { stubTravel } from "@/features/family-core/stubs";

export const Route = createFileRoute("/du-lich")({
  head: () => ({ meta: [{ title: `${stubTravel.title} — STOS Life` }] }),
  component: () => (
    <MobileShell>
      <StubPage {...stubTravel} />
    </MobileShell>
  ),
});
