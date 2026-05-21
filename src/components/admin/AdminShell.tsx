import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 shrink-0">
        <AdminSidebar />
      </aside>

      <main className="flex-1 p-4 md:p-10 max-w-[1400px] w-full">
        <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  className="md:hidden h-10 w-10 rounded-xl border border-border grid place-items-center shrink-0"
                  aria-label="Mở menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 bg-sidebar text-sidebar-foreground border-0"
              >
                <AdminSidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              {eyebrow && <p className="text-xs text-muted-foreground">{eyebrow}</p>}
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{title}</h1>
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 md:gap-3 shrink-0">{actions}</div>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
