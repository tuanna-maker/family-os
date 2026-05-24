import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { SHELL_OUTER, SHELL_CONTAINER } from "./shellLayout";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className={SHELL_OUTER}>
      <SideNav />
      <div className={SHELL_CONTAINER}>{children}</div>
      <BottomNav />
    </div>
  );
}
