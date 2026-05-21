import { useMockAuth } from "@/contexts/MockAuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { ROLES } from "@/constants/permissions";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCog, ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function RoleSwitcher() {
  const { user, users, switchRole, signOut } = useMockAuth();
  const router = useRouter();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <UserCog className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">{ROLES[user.role].name}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Demo · Đổi vai trò
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((u) => (
          <DropdownMenuItem
            key={u.id}
            onClick={() => {
              switchRole(u.id);
              toast.success(`Đã chuyển sang vai trò ${ROLES[u.role].name}`, { description: u.fullName });
              router.invalidate();
            }}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="text-[13px] font-medium">{ROLES[u.role].name}</span>
            <span className="text-[11px] text-muted-foreground">{u.fullName} · {u.email}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { signOut(); router.navigate({ to: "/demo-login" }); }} className="text-destructive">
          <LogOut className="h-3.5 w-3.5 mr-2" /> Đăng xuất demo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
