import { createFileRoute, Navigate } from "@tanstack/react-router";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/ky-niem-gia-dinh_/them")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: () => <Navigate to="/ky-niem-gia-dinh/upload" replace />,
});
