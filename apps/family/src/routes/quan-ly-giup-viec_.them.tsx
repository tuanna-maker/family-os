import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { HelperFormPage, type HelperFormType } from "@/features/family-core/helper-management/helper-form-page";
import { LoadingState } from "@shared/ui/common/States";
import { useFamilyContext } from "@/hooks/use-family-context";
import { requireAuth } from "@/api/require-auth";

const searchSchema = z.object({
  type: z.enum(["helper", "task", "attendance", "qr"]),
  helperId: z.string().optional(),
  id: z.string().optional(),
});

export const Route = createFileRoute("/quan-ly-giup-viec_/them")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Giúp việc — STOS Life" }] }),
  component: QuanLyGiupViecThemRoute,
});

function QuanLyGiupViecThemRoute() {
  const { type, helperId, id } = Route.useSearch();
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading || !familyId) return <LoadingState />;
  return (
    <HelperFormPage
      familyId={familyId}
      type={type as HelperFormType}
      helperId={helperId}
      editId={id}
    />
  );
}
