import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useFamilyContext } from "@/hooks/use-family-context";
import { FoodFormPage, type FoodFormType } from "@/features/family-core/food/food-form-page";
import { LoadingState } from "@shared/ui/common/States";
import { requireAuth } from "@/api/require-auth";

const searchSchema = z.object({
  type: z.enum(["food", "shop"]),
  id: z.string().optional(),
});

export const Route = createFileRoute("/thuc-pham_/them")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thêm món — STOS Life" }] }),
  component: ThucPhamThemRoute,
});

function ThucPhamThemRoute() {
  const { type, id } = Route.useSearch();
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading || !familyId) return <LoadingState />;
  return <FoodFormPage familyId={familyId} type={type as FoodFormType} editId={id} />;
}
