import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCollection } from "@/mock-data/store";
import { useScopedCollection, svc } from "@/lib/services";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { hasPermission } from "@/constants/permissions";
import type { Family, FamilyMember, Apartment, Resident } from "@/types/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users2, Search } from "lucide-react";
import { EmptyState } from "@/components/core/States";

export const Route = createFileRoute("/bql/ho-gia-dinh")({
  head: () => ({ meta: [{ title: "Hộ gia đình — BQL" }] }),
  component: HouseholdsScreen,
});

const ROLE_LABEL: Record<FamilyMember["role"], string> = {
  head: "Chủ hộ", spouse: "Vợ/Chồng", child: "Con", parent: "Cha/Mẹ",
  relative: "Người thân", delegate: "Ủy quyền", helper: "Giúp việc", emergency_contact: "Liên hệ khẩn cấp",
};

function HouseholdsScreen() {
  const { user } = useMockAuth();
  const families = useScopedCollection<Family>("families");
  const members = useCollection<FamilyMember>("family_members");
  const apartments = useCollection<Apartment>("apartments");
  const residents = useCollection<Resident>("residents");
  const aptMap = useMemo(() => new Map(apartments.map((a) => [a.id, a.code])), [apartments]);
  const resMap = useMemo(() => new Map(residents.map((r) => [r.id, r.fullName])), [residents]);

  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Family | null>(null);
  const [memberDialog, setMemberDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const canCreate = hasPermission(user?.role, "family.create");
  const canEdit = hasPermission(user?.role, "family.edit");
  const canDelete = hasPermission(user?.role, "family.delete");

  const filtered = families.filter((f) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return f.name.toLowerCase().includes(q) || aptMap.get(f.apartmentId)?.toLowerCase().includes(q);
  });

  const detailMembers = detail ? members.filter((m) => m.familyId === detail.id) : [];

  function addMember(fd: FormData) {
    if (!detail) return;
    svc.create<FamilyMember>("family_members", "fmem", {
      tenantId: detail.tenantId,
      projectId: detail.projectId,
      familyId: detail.id,
      apartmentId: detail.apartmentId,
      fullName: String(fd.get("fullName") ?? ""),
      phone: String(fd.get("phone") ?? "") || undefined,
      role: fd.get("role") as FamilyMember["role"],
      relationship: String(fd.get("relationship") ?? "") || undefined,
      isEmergencyContact: fd.get("role") === "emergency_contact",
    });
    toast.success("Đã thêm thành viên");
    setMemberDialog(false);
  }

  function createFamily(fd: FormData) {
    const aptId = String(fd.get("apartmentId") ?? "");
    const apt = apartments.find((a) => a.id === aptId);
    if (!apt) { toast.error("Chọn căn hộ"); return; }
    svc.create<Family>("families", "fam", {
      tenantId: apt.tenantId,
      projectId: apt.projectId,
      apartmentId: apt.id,
      name: String(fd.get("name") ?? ""),
      note: String(fd.get("note") ?? "") || undefined,
    });
    toast.success("Đã tạo hộ gia đình");
    setCreating(false);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Hộ gia đình</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý nhóm hộ, thành viên, người ủy quyền & liên hệ khẩn cấp.</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm hộ
          </Button>
        )}
      </header>

      <div className="flex items-center gap-2 rounded-xl border bg-card/40 p-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hộ hoặc mã căn…" className="h-9 border-0 shadow-none focus-visible:ring-0" />
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} hộ</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Chưa có hộ gia đình" hint="Tạo hộ mới hoặc bỏ bộ lọc." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((f) => {
            const fmems = members.filter((m) => m.familyId === f.id);
            const ec = fmems.find((m) => m.isEmergencyContact);
            return (
              <button key={f.id} onClick={() => setDetail(f)} className="text-left rounded-xl border bg-card p-4 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Căn {aptMap.get(f.apartmentId) ?? "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]"><Users2 className="h-3 w-3 mr-1" />{fmems.length + 1}</Badge>
                </div>
                <p className="text-[12px] text-muted-foreground mt-2">Chủ hộ: <span className="text-foreground font-medium">{resMap.get(f.headResidentId ?? "") ?? "—"}</span></p>
                {ec && <p className="text-[11px] text-emergency mt-1">SOS: {ec.fullName} · {ec.phone}</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription>Căn {aptMap.get(detail.apartmentId)} · {detailMembers.length + 1} thành viên</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-[13px]">
                {detail.note && <p className="rounded-md bg-muted/50 p-2 text-[12px]">{detail.note}</p>}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[13px]">Thành viên</h3>
                  {canEdit && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMemberDialog(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Thêm
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {detail.headResidentId && (
                    <li className="rounded-md border p-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{resMap.get(detail.headResidentId)}</p>
                        <p className="text-[11px] text-muted-foreground">Chủ hộ</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">head</Badge>
                    </li>
                  )}
                  {detailMembers.map((m) => (
                    <li key={m.id} className="rounded-md border p-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">{m.relationship ?? ROLE_LABEL[m.role]} {m.phone && `· ${m.phone}`}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={m.isEmergencyContact ? "destructive" : "outline"} className="text-[10px]">{ROLE_LABEL[m.role]}</Badge>
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { svc.remove("family_members", m.id); toast.success("Đã xoá"); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add member */}
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm thành viên</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addMember(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="space-y-1"><Label>Họ tên *</Label><Input name="fullName" required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>SĐT</Label><Input name="phone" /></div>
              <div className="space-y-1"><Label>Vai trò *</Label>
                <select name="role" required className="flex h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label>Quan hệ (ghi rõ)</Label><Input name="relationship" placeholder="Con trai, em ruột…" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setMemberDialog(false)}>Huỷ</Button><Button type="submit">Thêm</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create family */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo hộ gia đình</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createFamily(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="space-y-1"><Label>Tên hộ *</Label><Input name="name" required placeholder="Gia đình anh Nam" /></div>
            <div className="space-y-1"><Label>Căn hộ *</Label>
              <select name="apartmentId" required className="flex h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">— chọn —</option>
                {apartments.map((a) => <option key={a.id} value={a.id}>{a.code}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Ghi chú</Label><Input name="note" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCreating(false)}>Huỷ</Button><Button type="submit">Tạo</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
