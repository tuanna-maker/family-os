import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileClock, Filter, RotateCcw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { listAuditLogs, listAuditActors } from "@/lib/admin.functions";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/admin/audit")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Audit Logs — Admin" }] }),
  component: AdminAuditPage,
});

type Filters = {
  from: string; // yyyy-mm-dd
  to: string;
  actor_id: string;
  action: string;
};

const EMPTY: Filters = { from: "", to: "", actor_id: "", action: "" };

function AdminAuditPage() {
  return (
    <AdminGate>
      <AdminShell eyebrow="Audit" title="Nhật ký hành động" actions={null}>
        <AuditContent />
      </AdminShell>
    </AdminGate>
  );
}

function AuditContent() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchLogs = useServerFn(listAuditLogs);
  const fetchActors = useServerFn(listAuditActors);

  const actorsQ = useQuery({
    queryKey: ["audit-actors"],
    queryFn: () => fetchActors(),
  });

  const queryArgs = useMemo(() => {
    return {
      from: applied.from ? new Date(applied.from + "T00:00:00").toISOString() : null,
      to: applied.to ? new Date(applied.to + "T23:59:59").toISOString() : null,
      actor_id: applied.actor_id || null,
      action: applied.action.trim() || null,
      page,
      page_size: pageSize,
    };
  }, [applied, page, pageSize]);

  const logsQ = useQuery({
    queryKey: ["audit-logs", queryArgs],
    queryFn: () => fetchLogs({ data: queryArgs }),
  });

  const apply = () => {
    setPage(1);
    setApplied(filters);
  };
  const reset = () => {
    setFilters(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };

  const total = logsQ.data?.total ?? 0;
  const rows = logsQ.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="rounded-3xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Bộ lọc</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="Từ ngày">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm w-full"
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm w-full"
            />
          </Field>
          <Field label="Người thực hiện">
            <select
              value={filters.actor_id}
              onChange={(e) => setFilters({ ...filters, actor_id: e.target.value })}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm w-full"
            >
              <option value="">Tất cả</option>
              {(actorsQ.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loại hành động">
            <input
              type="text"
              placeholder="vd: role.grant"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm w-full"
            />
          </Field>
          <div className="flex items-end gap-2">
            <button
              onClick={apply}
              className="flex-1 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Áp dụng
            </button>
            <button
              onClick={reset}
              className="h-10 w-10 rounded-xl border border-border grid place-items-center"
              aria-label="Đặt lại"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileClock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Hoạt động</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {logsQ.isLoading
              ? "Đang tải…"
              : `${total} bản ghi • Trang ${page}/${totalPages}`}
          </span>
        </div>

        {logsQ.isError ? (
          <p className="p-5 text-sm text-destructive">
            {(logsQ.error as Error).message}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-4 font-medium">Thời gian</th>
                  <th className="text-left p-4 font-medium">Người thực hiện</th>
                  <th className="text-left p-4 font-medium">Hành động</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Đối tượng</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-4">
                      <p className="font-medium truncate max-w-[180px]">
                        {r.actor_name || (r.actor_id ? r.actor_id.slice(0, 8) : "Hệ thống")}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full bg-tint-blue text-brand text-xs font-mono">
                        {r.action}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-xs text-muted-foreground">
                      {r.target_table ? (
                        <>
                          <span className="font-medium">{r.target_table}</span>
                          {r.target_id ? (
                            <span className="ml-1 font-mono">#{r.target_id.slice(0, 8)}</span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <code className="text-[11px] text-muted-foreground break-all line-clamp-2">
                        {r.metadata_json ?? "—"}
                      </code>
                    </td>
                  </tr>
                ))}
                {!logsQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                      Không có bản ghi nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 rounded-lg bg-muted/40 border border-border text-xs"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>/ trang</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || logsQ.isLoading}
              className="h-9 px-3 rounded-xl border border-border text-sm disabled:opacity-40"
            >
              ← Trước
            </button>
            <span className="text-xs text-muted-foreground tabular-nums px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || logsQ.isLoading}
              className="h-9 px-3 rounded-xl border border-border text-sm disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
