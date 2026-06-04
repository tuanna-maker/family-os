import { createFileRoute } from "@tanstack/react-router";
import { useFamilyContext } from "@/hooks/use-family-context";
import { TripFormPage } from "@/features/family-core/travel/trip-form-page";
import { LoadingState } from "@shared/ui/common/States";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/du-lich_/them")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chuyến đi mới — STOS Life" }] }),
  component: NewTripRoute,
});

function NewTripRoute() {
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading || !familyId) return <LoadingState />;
  return <TripFormPage familyId={familyId} />;
}
