import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PagePendingSkeleton } from "@/components/PagePendingSkeleton";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Giữ dữ liệu cũ trong khi fetch mới → không nhấp nháy blank
        placeholderData: (prev: unknown) => prev,
        staleTime: 30_000,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Giữ trang cũ trong lúc loader chạy; chỉ hiện skeleton nếu vượt 250ms
    defaultPendingComponent: PagePendingSkeleton,
    defaultPendingMs: 250,
    defaultPendingMinMs: 300,
  });

  return router;
};
