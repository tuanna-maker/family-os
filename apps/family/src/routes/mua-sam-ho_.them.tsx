import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useFamilyContext } from "@/hooks/use-family-context";
import { FoodFormPage } from "@/features/family-core/food/food-form-page";
import { LoadingState } from "@shared/ui/common/States";
import { requireAuth } from "@/api/require-auth";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/mua-sam-ho_/them")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thêm món — Mua sắm hộ" }] }),
  component: MuaSamHoThemRoute,
});

function MuaSamHoThemRoute() {
  const { id } = Route.useSearch();
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading || !familyId) return <LoadingState />;
  return (
    <FoodFormPage
      familyId={familyId}
      type="shop"
      editId={id}
      backTo="/mua-sam-ho"
      pageEyebrow="Mua sắm hộ"
    />
  );
}
