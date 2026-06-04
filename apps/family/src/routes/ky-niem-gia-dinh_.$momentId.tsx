import { createFileRoute } from "@tanstack/react-router";
import { MomentDetailPage } from "@/features/family-core/memories/MomentDetailPage";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/ky-niem-gia-dinh_/$momentId")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chi tiết kỷ niệm — STOS Life" }] }),
  component: MomentDetailRoute,
});

function MomentDetailRoute() {
  const { momentId } = Route.useParams();
  return <MomentDetailPage momentId={momentId} />;
}
