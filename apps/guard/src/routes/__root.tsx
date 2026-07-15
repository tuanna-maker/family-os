import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "@shared/ui/ui/sonner";
import { AuthProvider } from "@shared/ui/hooks/use-auth";
import { PushInit } from "@/components/PushInit";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <AuthProvider>
      <PushInit />
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
