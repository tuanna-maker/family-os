import { createFileRoute } from "@tanstack/react-router";
import { HelperLivePage } from "@/features/family-core/helper-management/HelperLive";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/quan-ly-giup-viec")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Quản lý giúp việc — STOS Life" }] }),
  component: HelperLivePage,
});
