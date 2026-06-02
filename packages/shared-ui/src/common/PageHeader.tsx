import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { MOBILE_HEADER_PT } from "../mobile/shellLayout";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  emoji?: string;
  /** Path for back button. Pass `false` for top-level tab screens. */
  back?: string | false;
  right?: ReactNode;
};

/**
 * PageHeader — header chuẩn cho mọi mobile screen.
 * - Có/không back button
 * - Có eyebrow để gắn nhãn module (Family Core, …)
 */
export function PageHeader({ title, subtitle, eyebrow, emoji, back = "/", right }: Props) {
  return (
    <header className={`px-5 pb-3 flex items-center gap-3 ${MOBILE_HEADER_PT}`}>
      {back !== false && (
        <Link
          to={back}
          className="h-11 w-11 rounded-2xl bg-card border border-border grid place-items-center shrink-0 touch-manipulation active:scale-95 transition-transform"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-wider text-brand font-semibold">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {right ?? (emoji && <div className="text-3xl shrink-0">{emoji}</div>)}
    </header>
  );
}
