import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TripItemFormPage } from "@/features/family-core/travel/trip-item-form-page";
import { requireAuth } from "@/api/require-auth";

const searchSchema = z.object({
  kind: z.enum(["checklist", "packing", "budget"]),
});

export const Route = createFileRoute("/du-lich_/$tripId/them-muc")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thêm mục — STOS Life" }] }),
  component: AddTripItemRoute,
});

function AddTripItemRoute() {
  const { tripId } = Route.useParams();
  const { kind } = Route.useSearch();
  return <TripItemFormPage tripId={tripId} kind={kind} />;
}
