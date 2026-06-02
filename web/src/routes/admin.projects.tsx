import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus, Pencil, Trash2, Search, Eye, X, MapPin, Clock, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { requireAuth } from "@/lib/require-auth";
import {
  adminListProjects,
  adminCreateProject,
  adminUpdateProject,
  adminSetProjectStatus,
  adminDeleteProject,
  adminGetProjectDetail,
} from "@/lib/projects-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/projects")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Quản lý chung cư — Admin" }] }),
  component: () => (
    <AdminGate>
      <ProjectsAdmin />
    </AdminGate>
  ),
});

type Status = "active" | "pending" | "archived";
type Row = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  status: string;
  tenant_id: string;
  created_at: string;
};
type FormState = {
  id?: string;
  code: string;
  name: string;
  city: string;
  address: string;
  status: Status;
};

const EMPTY: FormState = { code: "", name: "", city: "", address: "", status: "active" };

function ProjectsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListProjects);
  const create = useServerFn(adminCreateProject);
  const update = useServerFn(adminUpdateProject);
  const setStatus = useServerFn(adminSetProjectStatus);
  const remove = useServerFn(adminDeleteProject);
  const getDetail = useServerFn(adminGetProjectDetail);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => list(),
  });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  type SortKey = "code" | "name" | "city" | "status";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (k: SortKey) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  };
  const STATUS_ORDER: Record<string, number> = { active: 0, pending: 1, archived: 2 };

  const detailQuery = useQuery({
    queryKey: ["admin", "projects", "detail", detailId],
    queryFn: () => getDetail({ data: { id: detailId! } }),
    enabled: !!detailId,
  });

  const rows: Row[] = useMemo(() => (data?.projects ?? []) as Row[], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === "status") {
        return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir;
      }
      const av = ((a[sortKey] as string | null) ?? "").toString();
      const bv = ((b[sortKey] as string | null) ?? "").toString();
      return av.localeCompare(bv, "vi", { sensitivity: "base", numeric: true }) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize],
  );
  // reset to page 1 when search/pageSize/sort changes
  useEffect(() => setPage(1), [search, pageSize, sortKey, sortDir]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "projects"] });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        code: f.code,
        name: f.name,
        city: f.city || null,
        address: f.address || null,
        status: f.status,
      };
      if (f.id) return update({ data: { ...payload, id: f.id } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(form.id ? "Đã cập nhật chung cư" : "Đã thêm chung cư");
      setOpen(false);
      setForm(EMPTY);
      setCodeError(null);
      invalidate();
    },
    onError: (e: any) => {
      const msg: string = e?.message ?? "Lỗi khi lưu";
      if (msg.startsWith("DUPLICATE_CODE:")) {
        setCodeError(msg.replace("DUPLICATE_CODE:", ""));
        toast.error("Mã chung cư đã tồn tại");
      } else {
        setCodeError(null);
        toast.error(msg);
      }
    },
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; status: Status }) => setStatus({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message ?? "Lỗi cập nhật trạng thái"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã xoá");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Không thể xoá"),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setCodeError(null);
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setForm({
      id: r.id,
      code: r.code,
      name: r.name,
      city: r.city ?? "",
      address: r.address ?? "",
      status: (r.status as Status) ?? "active",
    });
    setCodeError(null);
    setOpen(true);
  };

  return (
    <AdminShell
      eyebrow="Quản trị hệ thống"
      title="Quản lý chung cư"
      actions={
        <button
          onClick={openCreate}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Thêm chung cư
        </button>
      }
    >
      <div className="rounded-3xl bg-card border border-border p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã, thành phố…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length}/{rows.length} chung cư
          </span>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Đang tải…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Chưa có chung cư phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <SortableTh label="Mã" k="code" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <SortableTh label="Tên chung cư" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <SortableTh label="Thành phố" k="city" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <SortableTh label="Trạng thái" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <th className="text-right py-2 px-2">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-2 px-2 font-mono text-xs">{r.code}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{r.name}</span>
                      </div>
                      {r.address && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {r.address}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{r.city ?? "—"}</td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() =>
                          toggleMut.mutate({
                            id: r.id,
                            status: r.status === "active" ? "archived" : "active",
                          })
                        }
                        disabled={toggleMut.isPending}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                          r.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : r.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-muted text-muted-foreground border-border"
                        }`}
                        title="Bấm để bật/tắt"
                      >
                        {r.status === "active"
                          ? "Đang hoạt động"
                          : r.status === "pending"
                            ? "Chờ duyệt"
                            : "Tạm ngưng"}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setDetailId(r.id)}
                          className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Xoá chung cư "${r.name}"?`)) deleteMut.mutate(r.id);
                          }}
                          className="h-8 w-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 px-2 rounded-lg bg-background border border-border text-xs"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} / {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="h-8 px-2 rounded-lg border border-border text-xs disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-lg border border-border text-xs disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs px-2 text-muted-foreground">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 rounded-lg border border-border text-xs disabled:opacity-40"
              >
                Sau
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 px-2 rounded-lg border border-border text-xs disabled:opacity-40"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {form.id ? "Sửa chung cư" : "Thêm chung cư"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMut.mutate(form);
              }}
              className="space-y-3"
            >
              <Field label="Mã *">
                <input
                  required
                  value={form.code}
                  onChange={(e) => {
                    setForm({ ...form, code: e.target.value });
                    if (codeError) setCodeError(null);
                  }}
                  placeholder="VD: PRJ-042"
                  aria-invalid={!!codeError}
                  className={`w-full h-10 px-3 rounded-xl bg-background border text-sm ${
                    codeError ? "border-destructive" : "border-border"
                  }`}
                />
                {codeError && (
                  <p className="text-xs text-destructive mt-1">{codeError}</p>
                )}
              </Field>
              <Field label="Tên chung cư *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Thành phố">
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                  />
                </Field>
                <Field label="Trạng thái">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as Status })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="archived">Tạm ngưng</option>
                  </select>
                </Field>
              </div>
              <Field label="Địa chỉ">
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border text-sm"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saveMut.isPending}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                >
                  {saveMut.isPending ? "Đang lưu…" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {detailId && (
        <DetailModal
          loading={detailQuery.isLoading}
          data={detailQuery.data}
          onClose={() => setDetailId(null)}
          onEdit={(r) => {
            setDetailId(null);
            openEdit(r);
          }}
        />
      )}
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  k: "code" | "name" | "city" | "status";
  sortKey: "code" | "name" | "city" | "status" | null;
  sortDir: "asc" | "desc";
  onClick: (k: "code" | "name" | "city" | "status") => void;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="text-left py-2 px-2">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-50"}`} />
      </button>
    </th>
  );
}



type DetailData = {
  project: {
    id: string;
    code: string;
    name: string;
    city: string | null;
    address: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  logs: Array<{
    id: string;
    action: string;
    actor_id: string | null;
    metadata: any;
    created_at: string;
  }>;
  actors: Record<string, { name: string | null; email: string | null }>;
};

function actionLabel(a: string) {
  if (a === "project.create") return "Tạo mới";
  if (a === "project.update") return "Cập nhật";
  if (a === "project.set_status") return "Đổi trạng thái";
  if (a === "project.delete") return "Xoá";
  return a;
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("vi-VN");
  } catch {
    return s;
  }
}

function DetailModal({
  loading,
  data,
  onClose,
  onEdit,
}: {
  loading: boolean;
  data?: DetailData;
  onClose: () => void;
  onEdit: (r: any) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Chi tiết chung cư
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !data ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Đang tải…</div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">
                  {data.project.code}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    data.project.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : data.project.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {data.project.status === "active"
                    ? "Đang hoạt động"
                    : data.project.status === "pending"
                      ? "Chờ duyệt"
                      : "Tạm ngưng"}
                </span>
              </div>
              <h3 className="text-xl font-semibold mt-2">{data.project.name}</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Thành phố</div>
                <div>{data.project.city ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Địa chỉ
                </div>
                <div className="whitespace-pre-wrap">{data.project.address ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Ngày tạo</div>
                <div>{fmtDate(data.project.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cập nhật gần nhất</div>
                <div>{fmtDate(data.project.updated_at)}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Lịch sử tạo / sửa</h4>
                <span className="text-xs text-muted-foreground">
                  ({data.logs.length})
                </span>
              </div>
              {data.logs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">
                  Chưa có hoạt động nào được ghi nhận.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.logs.map((l) => {
                    const a = l.actor_id ? data.actors[l.actor_id] : null;
                    const who = a?.name || a?.email || "Hệ thống";
                    return (
                      <li
                        key={l.id}
                        className="text-xs border border-border rounded-xl p-3 bg-background/50"
                      >
                        <div className="flex justify-between gap-2 items-start">
                          <span className="font-medium text-foreground">
                            {actionLabel(l.action)}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {fmtDate(l.created_at)}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-1">bởi {who}</div>
                        {l.metadata && Object.keys(l.metadata).length > 0 && (
                          <pre className="mt-2 text-[11px] bg-muted/40 rounded p-2 overflow-x-auto">
                            {JSON.stringify(l.metadata, null, 2)}
                          </pre>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={onClose}
                className="h-10 px-4 rounded-xl border border-border text-sm"
              >
                Đóng
              </button>
              <button
                onClick={() => onEdit(data.project)}
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" /> Sửa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
