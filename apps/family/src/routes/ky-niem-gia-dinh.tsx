import { createFileRoute } from "@tanstack/react-router";
import { MemoriesLive } from "@/features/family-core/memories/MemoriesLive";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/ky-niem-gia-dinh")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [
      { title: "Kỷ niệm gia đình — STOS Life" },
      { name: "description", content: "Album ảnh và khoảnh khắc gia đình trên STOS Life." },
    ],
  }),
  component: MemoriesLive,
});
