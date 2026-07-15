import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useFamilyContext } from "@/hooks/use-family-context";
import { ChildFormPage, type ChildFormType } from "@/features/family-core/children/child-form-page";
import { LoadingState } from "@shared/ui/common/States";
import { requireAuth } from "@/api/require-auth";

const searchSchema = z.object({
  type: z.enum(["child", "schedule", "homework", "achievement", "reminder"]),
  childId: z.string().optional(),
  id: z.string().optional(),
});

export const Route = createFileRoute("/con-cai_/them")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thêm — STOS Life" }] }),
  component: ConCaiThemRoute,
});

function ConCaiThemRoute() {
  const { type, childId, id } = Route.useSearch();
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading || !familyId) return <LoadingState />;
  return (
    <ChildFormPage
      familyId={familyId}
      type={type as ChildFormType}
      childId={childId}
      editId={id}
    />
  );
}
