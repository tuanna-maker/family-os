import type { ReactNode } from "react";
import { cn } from "@shared/utils";
import { SideNav } from "./SideNav";
import { SHELL_OUTER, SHELL_CONTAINER } from "./shellLayout";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className={SHELL_OUTER}>
      <SideNav />
      <div
        className={cn(
          SHELL_CONTAINER,
          "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] md:pb-12",
        )}
      >
        {children}
      </div>
    </div>
  );
}
