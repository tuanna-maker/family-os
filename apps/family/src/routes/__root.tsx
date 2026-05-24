import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "@shared/ui/ui/sonner";
import { AuthProvider } from "@shared/ui/hooks/use-auth";
import { ThemeProvider } from "@shared/ui/hooks/use-theme";
import { EasyReadProvider } from "@shared/ui/hooks/use-easy-read";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider>
      <EasyReadProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </EasyReadProvider>
    </ThemeProvider>
  );
}
