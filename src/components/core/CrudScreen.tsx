/**
 * CrudScreen — opinionated, config-driven master-data screen.
 * Hand it a collection name + columns + form fields and you get:
 * search, filter, status badge, data table, detail drawer, create/edit modal,
 * delete confirm, empty state, loading state, toast notifications.
 *
 * All data flows through mockStore so swapping to Supabase is mechanical.
 */
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, RotateCcw, Eye } from "lucide-react";
import { mockStore, genId } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { hasPermission } from "@/constants/permissions";
import { EmptyState, LoadingState } from "./States";
import type { Permission } from "@/types/core";

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "email" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface CrudConfig<T extends { id: string; tenantId?: string | null }> {
  collection: string;
  entityLabel: string;
  entityLabelPlural: string;
  idPrefix: string;
  columns: ColumnDef<T>[];
  fields: FieldDef<T>[];
  searchKeys: (keyof T & string)[];
  filters?: FilterDef[];
  scopeByTenant?: boolean;
  permissions: {
    view: Permission;
    create?: Permission;
    edit?: Permission;
    delete?: Permission;
  };
  defaults?: Partial<T>;
  detail?: (row: T) => ReactNode;
  data?: T[];                                   // override (e.g. join with related rows)
}

export function CrudScreen<T extends { id: string; tenantId?: string | null }>({
  config,
  title,
  subtitle,
  rows,
  loading,
}: {
  config: CrudConfig<T>;
  title: string;
  subtitle?: string;
  rows?: T[];                                   // pass externally if you need joins
  loading?: boolean;
}) {
  const { user } = useMockAuth();
  const { scope, currentTenantId } = useTenant();
  const all = (rows ?? mockStore.list<T>(config.collection)) as T[];
  const scoped = config.scopeByTenant === false ? all : scope(all);

  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [detail, setDetail] = useState<T | null>(null);

  const canCreate = config.permissions.create ? hasPermission(user?.role, config.permissions.create) : false;
  const canEdit   = config.permissions.edit   ? hasPermission(user?.role, config.permissions.edit)   : false;
  const canDelete = config.permissions.delete ? hasPermission(user?.role, config.permissions.delete) : false;

  const filtered = useMemo(() => {
    let r = scoped;
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((row) =>
        config.searchKeys.some((k) => String((row as Record<string, unknown>)[k] ?? "").toLowerCase().includes(q)),
      );
    }
    for (const [k, v] of Object.entries(filterValues)) {
      if (v && v !== "__all__") r = r.filter((row) => String((row as Record<string, unknown>)[k]) === v);
    }
    return r;
  }, [scoped, query, filterValues, config.searchKeys]);

  function resetFilters() {
    setQuery("");
    setFilterValues({});
  }

  function handleSave(values: Partial<T>) {
    if (editing) {
      mockStore.update<T>(config.collection, editing.id, values);
      toast.success(`Đã cập nhật ${config.entityLabel.toLowerCase()}`);
      setEditing(null);
    } else {
      const newRow = {
        id: genId(config.idPrefix),
        tenantId: currentTenantId ?? user?.tenantId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...config.defaults,
        ...values,
      } as unknown as T;
      mockStore.insert<T>(config.collection, newRow);
      toast.success(`Đã thêm ${config.entityLabel.toLowerCase()}`);
      setCreating(false);
    }
  }

  function handleDelete() {
    if (!deleting) return;
    mockStore.remove(config.collection, deleting.id);
    toast.success(`Đã xoá ${config.entityLabel.toLowerCase()}`);
    setDeleting(null);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm {config.entityLabel.toLowerCase()}
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`Tìm ${config.entityLabelPlural.toLowerCase()}…`} className="pl-8 h-9" />
        </div>
        {config.filters?.map((f) => (
          <Select key={f.key} value={filterValues[f.key] ?? "__all__"}
            onValueChange={(v) => setFilterValues((p) => ({ ...p, [f.key]: v }))}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder={f.label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả · {f.label}</SelectItem>
              {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} / {scoped.length} dòng</span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`Chưa có ${config.entityLabelPlural.toLowerCase()}`}
            hint="Thử bỏ bộ lọc hoặc thêm bản ghi mới."
            action={canCreate ? <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Thêm mới</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((c) => <TableHead key={String(c.key)} className={c.className}>{c.label}</TableHead>)}
                <TableHead className="w-[120px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setDetail(row)}>
                  {config.columns.map((c) => (
                    <TableCell key={String(c.key)} className={c.className}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key as string] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetail(row)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit modal */}
      <FormDialog<T>
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        title={editing ? `Sửa ${config.entityLabel.toLowerCase()}` : `Thêm ${config.entityLabel.toLowerCase()}`}
        fields={config.fields}
        initial={editing ?? undefined}
        onSubmit={handleSave}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá {config.entityLabel.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động không thể hoàn tác. Bản ghi sẽ bị xoá vĩnh viễn khỏi mock store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết {config.entityLabel.toLowerCase()}</SheetTitle>
            <SheetDescription className="text-[11px] font-mono">{detail?.id}</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-3 text-[13px]">
              {config.detail ? config.detail(detail) : (
                <dl className="space-y-2">
                  {config.columns.map((c) => (
                    <div key={String(c.key)} className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground text-[12px]">{c.label}</dt>
                      <dd className="text-right font-medium max-w-[60%]">
                        {c.render ? c.render(detail) : String((detail as Record<string, unknown>)[c.key as string] ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FormDialog<T extends { id: string }>({
  open, onOpenChange, title, fields, initial, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: FieldDef<T>[];
  initial?: T;
  onSubmit: (values: Partial<T>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Điền thông tin bên dưới. Trường có dấu * là bắt buộc.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const values: Record<string, unknown> = {};
            for (const f of fields) {
              const raw = fd.get(f.key);
              if (f.required && !raw) { toast.error(`Vui lòng nhập "${f.label}"`); return; }
              values[f.key] = f.type === "number" ? Number(raw ?? 0) : raw ?? "";
            }
            onSubmit(values as Partial<T>);
          }}
          className="space-y-3 mt-2"
        >
          {fields.map((f) => {
            const initialValue = initial ? (initial as Record<string, unknown>)[f.key] : undefined;
            const defaultValue = initialValue == null ? "" : String(initialValue);
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-[12px]">
                  {f.label}{f.required && <span className="text-destructive"> *</span>}
                </Label>
                {f.type === "select" ? (
                  <select id={f.key} name={f.key} defaultValue={defaultValue} required={f.required}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                    <option value="">— chọn —</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea id={f.key} name={f.key} defaultValue={defaultValue} required={f.required}
                    placeholder={f.placeholder}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                ) : (
                  <Input id={f.key} name={f.key} type={f.type ?? "text"} defaultValue={defaultValue}
                    required={f.required} placeholder={f.placeholder} />
                )}
              </div>
            );
          })}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button type="submit">{initial ? "Cập nhật" : "Tạo mới"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
