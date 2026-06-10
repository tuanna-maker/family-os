import type { ReactNode } from "react";
import { GuardTabBar } from "./GuardTabBar";
import { GuardNavBar } from "./GuardNavBar";
import { GUARD_SHELL_OUTER, GUARD_CONTENT } from "./guardLayout";
import { cn } from "@/lib/utils";

export type GuardShellProps = {
  children: ReactNode;
  largeTitle?: string;
  subtitle?: string;
  title?: string;
  backTo?: string;
  backLabel?: string;
  trailing?: ReactNode;
  hideTabBar?: boolean;
  className?: string;
};

export function GuardMobileShell({
  children,
  largeTitle,
  subtitle,
  title,
  backTo,
  backLabel,
  trailing,
  hideTabBar,
  className,
}: GuardShellProps) {
  return (
    <div className={GUARD_SHELL_OUTER}>
      <div className={cn(GUARD_CONTENT, !hideTabBar && "guard-has-tabbar", className)}>
        <GuardNavBar
          largeTitle={largeTitle}
          subtitle={subtitle}
          title={title}
          backTo={backTo}
          backLabel={backLabel}
          trailing={trailing}
          showBrand={!!largeTitle}
        />
        <main className="guard-main-scroll">{children}</main>
      </div>
      {!hideTabBar && <GuardTabBar />}
    </div>
  );
}
