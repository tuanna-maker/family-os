import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Check, Clock, Trash2, Undo2, Plus, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/lib/require-auth";
import { getMyContext } from "@/lib/auth.functions";
import {
  listChildren,
  upsertParentReminder,
  toggleReminder,
  deleteChildrenRow,
  type ParentReminderRow,
} from "@/lib/children.functions";

export const Route = createFileRoute("/gia-dinh_/nhac-cha-me")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Nhắc cha mẹ — Gia đình tôi" }] }),
  component: ParentRemindersPage,
});

type Tab = "thiet-lap" | "lich-su";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRemind(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function ParentRemindersPage() {
  const ctxFn = useServerFn(getMyContext);
  const listFn = useServerFn(listChildren);
  const upsertFn = useServerFn(upsertParentReminder);
  const toggleFn = useServerFn(toggleReminder);
  const deleteFn = useServerFn(deleteChildrenRow);
  const qc = useQueryClient();

  const { data: ctx } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => ctxFn(),
    staleTime: 5 * 60_000,
  });
  const familyId = ctx?.family?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["children-bundle", familyId],
    queryFn: () => listFn({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  const children = data?.children ?? [];
  const reminders = data?.reminders ?? [];

  const [tab, setTab] = useState<Tab>("thiet-lap");
  const [title, setTitle] = useState("");
  const [childId, setChildId] = useState<string>("none");
  const [remindAt, setRemindAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { pending, done } = useMemo(() => {
    const p: ParentReminderRow[] = [];
    const d: ParentReminderRow[] = [];
    for (const r of reminders) (r.done ? d : p).push(r);
    p.sort((a, b) => +new Date(a.remind_at) - +new Date(b.remind_at));
    d.sort((a, b) => +new Date(b.remind_at) - +new Date(a.remind_at));
    return { pending: p, done: d };
  }, [reminders]);

  async function handleSave() {
    if (!familyId) return;
    const t = title.trim();
    if (!t) {
      toast.error("Nhập tiêu đề nhắc");
      return;
    }
    if (!remindAt) {
      toast.error("Chọn thời gian nhắc");
      return;
    }
    setSaving(true);
    try {
      await upsertFn({
        data: {
          family_id: familyId,
          child_id: childId === "none" ? null : childId,
          title: t,
          remind_at: new Date(remindAt).toISOString(),
          done: false,
          notes: notes.trim() || null,
        },
      });
      toast.success("Đã tạo nhắc");
      setTitle("");
      setNotes("");
      setChildId("none");
      qc.invalidateQueries({ queryKey: ["children-bundle", familyId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(r: ParentReminderRow) {
    try {
      await toggleFn({ data: { id: r.id, done: !r.done } });
      qc.invalidateQueries({ queryKey: ["children-bundle", familyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá nhắc này?")) return;
    try {
      await deleteFn({ data: { table: "parent_reminders", id } });
      toast.success("Đã xoá");
      qc.invalidateQueries({ queryKey: ["children-bundle", familyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <MobileShell>
      <PageHeader
        title="Nhắc cha mẹ"
        subtitle="Thiết lập nhắc & lịch sử đã gửi"
        eyebrow="Gia đình"
        back="/gia-dinh"
        emoji="🔔"
      />

      {/* Tabs */}
      <div className="px-5 mt-1">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted/60 border border-border">
          <TabButton active={tab === "thiet-lap"} onClick={() => setTab("thiet-lap")}>
            <Plus className="h-4 w-4" /> Thiết lập
          </TabButton>
          <TabButton active={tab === "lich-su"} onClick={() => setTab("lich-su")}>
            <History className="h-4 w-4" /> Lịch sử
          </TabButton>
        </div>
      </div>

      {!familyId && !isLoading && (
        <div className="px-5 mt-6">
          <RoundedCard className="text-sm text-muted-foreground">
            Bạn chưa có hộ gia đình.{" "}
            <Link to="/gia-dinh/onboarding" className="text-brand font-semibold">
              Thiết lập ngay
            </Link>
          </RoundedCard>
        </div>
      )}

      {tab === "thiet-lap" && familyId && (
        <div className="px-5 mt-4 space-y-4">
          <RoundedCard className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr-title">Tiêu đề</Label>
              <Input
                id="pr-title"
                placeholder="VD: Gọi điện hỏi thăm mẹ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pr-when">Thời gian</Label>
                <Input
                  id="pr-when"
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gắn với con (tuỳ chọn)</Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Không gắn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không gắn</SelectItem>
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-notes">Ghi chú</Label>
              <Textarea
                id="pr-notes"
                placeholder="Chi tiết thêm…"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Đang lưu…" : "Tạo nhắc"}
            </Button>
          </RoundedCard>

          {/* Pending list */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="text-[15px] font-semibold tracking-tight">Sắp tới</h2>
              <span className="text-[11px] text-muted-foreground">{pending.length} nhắc</span>
            </div>
            {pending.length === 0 ? (
              <RoundedCard className="text-sm text-muted-foreground text-center py-6">
                Chưa có nhắc nào sắp tới.
              </RoundedCard>
            ) : (
              <ul className="space-y-2">
                {pending.map((r) => (
                  <ReminderItem
                    key={r.id}
                    r={r}
                    childName={children.find((c) => c.id === r.child_id)?.name}
                    onToggle={() => handleToggle(r)}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "lich-su" && familyId && (
        <div className="px-5 mt-4 space-y-4 pb-4">
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="text-[15px] font-semibold tracking-tight">Đã hoàn tất</h2>
              <span className="text-[11px] text-muted-foreground">{done.length} nhắc</span>
            </div>
            {done.length === 0 ? (
              <RoundedCard className="text-sm text-muted-foreground text-center py-6">
                Chưa có nhắc nào được hoàn tất.
              </RoundedCard>
            ) : (
              <ul className="space-y-2">
                {done.map((r) => (
                  <ReminderItem
                    key={r.id}
                    r={r}
                    childName={children.find((c) => c.id === r.child_id)?.name}
                    onToggle={() => handleToggle(r)}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="text-[15px] font-semibold tracking-tight">Đã gửi (sắp tới)</h2>
              <span className="text-[11px] text-muted-foreground">{pending.length} nhắc</span>
            </div>
            {pending.length === 0 ? (
              <RoundedCard className="text-sm text-muted-foreground text-center py-6">
                Không có nhắc đang chờ.
              </RoundedCard>
            ) : (
              <ul className="space-y-2">
                {pending.map((r) => (
                  <ReminderItem
                    key={r.id}
                    r={r}
                    childName={children.find((c) => c.id === r.child_id)?.name}
                    onToggle={() => handleToggle(r)}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition",
        active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ReminderItem({
  r,
  childName,
  onToggle,
  onDelete,
}: {
  r: ParentReminderRow;
  childName?: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const overdue = !r.done && new Date(r.remind_at).getTime() < Date.now();
  return (
    <li className="rounded-2xl bg-card border border-border p-3 flex items-start gap-3">
      <button
        onClick={onToggle}
        className={cn(
          "h-9 w-9 rounded-full grid place-items-center shrink-0 border transition",
          r.done
            ? "bg-success text-white border-success"
            : "bg-tint-blue text-brand border-brand/30",
        )}
        aria-label={r.done ? "Bỏ hoàn tất" : "Đánh dấu đã làm"}
      >
        {r.done ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[14px] font-semibold leading-tight",
            r.done && "line-through text-muted-foreground",
          )}
        >
          {r.title}
        </p>
        <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRemind(r.remind_at)}
          </span>
          {childName && (
            <span className="px-1.5 py-0.5 rounded-full bg-tint-purple text-[oklch(0.55_0.2_295)] font-medium">
              {childName}
            </span>
          )}
          {overdue && (
            <span className="px-1.5 py-0.5 rounded-full bg-tint-red text-emergency font-medium">
              Quá hạn
            </span>
          )}
        </div>
        {r.notes && (
          <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{r.notes}</p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {r.done && (
          <button
            onClick={onToggle}
            className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted"
            aria-label="Hoàn tác"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted hover:text-emergency"
          aria-label="Xoá"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
