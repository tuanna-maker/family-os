import { createFileRoute } from "@tanstack/react-router";
import { SecurityChatPage } from "@/features/security-core/SecurityChatPage";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/bao-an_/chat")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chat bảo an — STOS Life" }] }),
  component: SecurityChatPage,
});
