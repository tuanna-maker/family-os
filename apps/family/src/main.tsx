import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initLogger, logger } from "@shared/utils";
import { supabase } from "@shared/supabase/client";
import { SentryAppRoot } from "@shared/ui";
import { initSentry } from "./init-sentry";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

void initSentry();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const loggingEnabled =
  import.meta.env.PROD || import.meta.env.VITE_ENABLE_LOGGING === "true";

if (loggingEnabled) {
  initLogger({
    app: "family",
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
  router.subscribe("onResolved", ({ toLocation }) => {
    logger.navigation(toLocation.pathname);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SentryAppRoot>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </SentryAppRoot>
  </StrictMode>,
);
