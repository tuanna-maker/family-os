import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building, ChevronDown, Check } from "lucide-react";
import { useMockAuth } from "@/contexts/MockAuthContext";

export function TenantSwitcher() {
  const { available, currentTenant, setCurrentTenant } = useTenant();
  const { hasRole } = useMockAuth();
  if (available.length === 0) return null;
  const locked = !hasRole("super_admin");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={locked}>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Building className="h-3.5 w-3.5" />
          <span className="max-w-[160px] truncate">{currentTenant?.name ?? "Chưa chọn tenant"}</span>
          {!locked && <ChevronDown className="h-3 w-3 opacity-60" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Chuyển tenant
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => setCurrentTenant(t.id)} className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{t.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{t.code} · {t.plan}</p>
            </div>
            {currentTenant?.id === t.id && <Check className="h-3.5 w-3.5 text-success" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
