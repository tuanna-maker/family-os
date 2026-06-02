import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function SubHeader({ title, back }: { title: string; back: string }) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-border">
      <Link
        to={back as any}
        className="h-9 w-9 rounded-full bg-card border border-border grid place-items-center"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h1 className="text-sm font-bold tracking-wide uppercase">{title}</h1>
    </header>
  );
}
