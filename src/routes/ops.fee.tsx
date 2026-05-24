import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ops/fee")({
  head: () => ({ meta: [{ title: "Thu phí dịch vụ — STOS Ops" }] }),
  component: FeeDetail,
});

const DATA = [
  { m: "T1", thu: 2.1, no: 0.3 }, { m: "T2", thu: 2.3, no: 0.4 }, { m: "T3", thu: 2.4, no: 0.5 },
  { m: "T4", thu: 2.2, no: 0.6 }, { m: "T5", thu: 2.5, no: 0.4 }, { m: "T6", thu: 2.45, no: 0.41 },
];
const DEBTORS = [
  { code: "A-1201", owner: "Nguyễn Văn A", months: 3, amount: 5_400_000 },
  { code: "B-0905", owner: "Trần Thị B", months: 2, amount: 3_600_000 },
  { code: "C-1502", owner: "Lê Văn C", months: 4, amount: 7_200_000 },
  { code: "A-0808", owner: "Phạm Thị D", months: 1, amount: 1_800_000 },
];

function FeeDetail() {
  const totalThu = DATA.reduce((s, d) => s + d.thu, 0);
  const totalNo = DATA.reduce((s, d) => s + d.no, 0);
  const rate = Math.round((totalThu / (totalThu + totalNo)) * 1000) / 10;

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/ops" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Quay lại
          </Link>
          <h1 className="text-[22px] font-bold mt-1 flex items-center gap-2">
            Thu phí dịch vụ
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Demo</span>
          </h1>
          <p className="text-[12px] text-muted-foreground">Cần bảng `fees` & `payments` để có số liệu thật</p>
        </div>
        <PermissionGate permission="fee.create">
          <button
            onClick={() => toast.success("Tạo phiếu thu (demo)")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[12px] hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Tạo phiếu thu
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Đã thu (6 tháng)", value: `${totalThu.toFixed(1)}B`, cls: "text-success" },
          { label: "Công nợ", value: `${totalNo.toFixed(2)}B`, cls: "text-warning" },
          { label: "Tỷ lệ thu", value: `${rate}%`, cls: rate >= 85 ? "text-success" : "text-warning" },
          { label: "Hộ nợ phí", value: DEBTORS.length, cls: "text-emergency" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("text-[24px] font-bold tabular-nums mt-1", k.cls)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold mb-3">Thu vs công nợ — 6 tháng</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DATA} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="thu" fill="oklch(0.55 0.2 264)" radius={[6, 6, 0, 0]} name="Đã thu (tỷ)" />
              <Bar dataKey="no" fill="oklch(0.75 0.18 70)" radius={[6, 6, 0, 0]} name="Công nợ (tỷ)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />Hộ đang nợ phí
          </h3>
          <span className="text-[11px] text-muted-foreground">{DEBTORS.length} hộ</span>
        </div>
        <table className="w-full text-[12px]">
          <thead className="bg-muted/50 text-muted-foreground text-[10.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Căn hộ</th>
              <th className="text-left px-4 py-2">Chủ hộ</th>
              <th className="text-right px-4 py-2">Số tháng</th>
              <th className="text-right px-4 py-2">Số tiền</th>
              <th className="text-right px-4 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {DEBTORS.map((d) => (
              <tr key={d.code} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono">{d.code}</td>
                <td className="px-4 py-2.5 font-medium">{d.owner}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{d.months}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                  {d.amount.toLocaleString("vi-VN")}₫
                </td>
                <td className="px-4 py-2.5 text-right">
                  <PermissionGate permission="payment.create" fallback={<span className="text-[10.5px] text-muted-foreground">—</span>}>
                    <button
                      onClick={() => toast.success(`Ghi thu ${d.code}`)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] bg-success/10 text-success hover:bg-success/20"
                    >Ghi thu</button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
