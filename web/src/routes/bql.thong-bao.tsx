import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useScopedCollection, svc } from "@/lib/services";
import { useCollection } from "@/mock-data/store";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { hasPermission } from "@/constants/permissions";
import type { Announcement, AnnouncementChannel, AnnouncementAudienceKind, Building, Project } from "@/types/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Megaphone, Send, Plus, Mail, MessageSquare, Bell, Eye } from "lucide-react";
import { EmptyState } from "@/components/core/States";

export const Route = createFileRoute("/bql/thong-bao")({
  head: () => ({ meta: [{ title: "Thông báo — BQL" }] }),
  component: AnnouncementsScreen,
});

const CH_ICON: Record<AnnouncementChannel, typeof Bell> = { push: Bell, email: Mail, sms: MessageSquare };
const STATUS_TONE: Record<string, "default" | "secondary" | "outline"> = { sent: "default", scheduled: "secondary", draft: "outline" };
const AUD_LABEL: Record<AnnouncementAudienceKind, string> = {
  all_project: "Toàn dự án", building: "Toà nhà", floor: "Tầng", apartment: "Căn hộ", group: "Nhóm",
};

function AnnouncementsScreen() {
  const { user } = useMockAuth();
  const { currentTenantId } = useTenant();
  const rows = useScopedCollection<Announcement>("announcements");
  const projects = useCollection<Project>("projects");
  const buildings = useCollection<Building>("buildings");
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Announcement | null>(null);

  const canCreate = hasPermission(user?.role, "announcement.create");
  const canSend = hasPermission(user?.role, "announcement.send");

  function createAnn(fd: FormData) {
    const channels: AnnouncementChannel[] = [];
    if (fd.get("ch_push")) channels.push("push");
    if (fd.get("ch_email")) channels.push("email");
    if (fd.get("ch_sms")) channels.push("sms");
    const projectId = String(fd.get("projectId") ?? "");
    const project = projects.find((p) => p.id === projectId);
    svc.create<Announcement>("announcements", "ann", {
      tenantId: project?.tenantId ?? currentTenantId ?? null,
      projectId,
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      channels,
      audience: { kind: fd.get("audience") as AnnouncementAudienceKind },
      status: fd.get("send") === "1" ? "sent" : "draft",
      sentAt: fd.get("send") === "1" ? new Date().toISOString() : undefined,
      readsCount: 0,
      recipientsCount: 240,
      authorId: user!.id,
      authorName: user!.fullName,
    } as any);
    toast.success(fd.get("send") === "1" ? "Đã gửi thông báo" : "Đã lưu nháp");
    setCreating(false);
  }

  function sendDraft(a: Announcement) {
    svc.update<Announcement>("announcements", a.id, { status: "sent", sentAt: new Date().toISOString() });
    toast.success("Đã gửi thông báo");
    setDetail(null);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Megaphone className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Thông báo</h1>
            <p className="text-xs text-muted-foreground">Gửi thông báo tới cư dân theo dự án / toà / tầng / căn.</p>
          </div>
        </div>
        {canCreate && <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Tạo thông báo</Button>}
      </header>

      {rows.length === 0 ? <EmptyState title="Chưa có thông báo" hint="Bấm 'Tạo thông báo' để bắt đầu." /> : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id} className="rounded-xl border bg-card p-3 hover:border-primary/40 cursor-pointer" onClick={() => setDetail(a)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{a.title}</p>
                    <Badge variant={STATUS_TONE[a.status]} className="text-[10px]">{a.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{AUD_LABEL[a.audience.kind]}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {projectMap.get(a.projectId) ?? a.projectId} · {a.authorName} · {a.sentAt ? `Gửi ${new Date(a.sentAt).toLocaleString("vi-VN")}` : "Chưa gửi"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex gap-1">
                    {a.channels.map((c) => { const Icon = CH_ICON[c]; return <Icon key={c} className="h-3.5 w-3.5 text-muted-foreground" />; })}
                  </div>
                  {a.status === "sent" && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{a.readsCount}/{a.recipientsCount}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tạo thông báo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createAnn(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="space-y-1"><Label>Tiêu đề *</Label><Input name="title" required /></div>
            <div className="space-y-1"><Label>Nội dung *</Label>
              <textarea name="body" required className="w-full min-h-[100px] rounded-md border bg-background p-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Dự án *</Label>
                <select name="projectId" required className="flex h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Đối tượng *</Label>
                <select name="audience" required defaultValue="all_project" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {Object.entries(AUD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Kênh gửi</Label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5"><input type="checkbox" name="ch_push" defaultChecked /> Push</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="ch_email" /> Email</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="ch_sms" /> SMS</label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" name="send" value="0" variant="outline">Lưu nháp</Button>
              {canSend && <Button type="submit" name="send" value="1"><Send className="h-3.5 w-3.5 mr-1.5" />Gửi ngay</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader><SheetTitle>{detail.title}</SheetTitle></SheetHeader>
              <div className="mt-3 space-y-3 text-[13px]">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={STATUS_TONE[detail.status]}>{detail.status}</Badge>
                  <Badge variant="outline">{AUD_LABEL[detail.audience.kind]}</Badge>
                  {detail.channels.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                </div>
                <p className="whitespace-pre-line">{detail.body}</p>
                <dl className="space-y-1 text-[12px] text-muted-foreground">
                  <div>Tác giả: {detail.authorName}</div>
                  <div>Dự án: {projectMap.get(detail.projectId)}</div>
                  {detail.sentAt && <div>Gửi: {new Date(detail.sentAt).toLocaleString("vi-VN")}</div>}
                  {detail.status === "sent" && <div>Đã đọc: {detail.readsCount}/{detail.recipientsCount}</div>}
                </dl>
                {canSend && detail.status === "draft" && (
                  <Button className="w-full" onClick={() => sendDraft(detail)}><Send className="h-4 w-4 mr-1.5" />Gửi ngay</Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
