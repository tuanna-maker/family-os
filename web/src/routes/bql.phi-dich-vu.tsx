import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBqlFees, listBqlFeePayments, recordBqlFeePayment, type FeeRow } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, Receipt, Wallet, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/bql/phi-dich-vu")({
  head: () => ({ meta: [{ title: "Phí dịch vụ — BQL" }] }),
  component: FeesScreen,
});

const TYPE_LABEL: Record<string, string> = {
  management: "Quản lý", parking: "Gửi xe", electricity: "Điện", water: "Nước", internet: "Internet", other: "Khác",
};
const STATUS_LABEL: Record<string, string> = {
  unpaid: "Chưa thu", partial: "Thu một phần", paid: "Đã thu", overdue: "Quá hạn", waived: "Miễn",
};
const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  unpaid: "outline", partial: "default", paid: "secondary", overdue: "destructive", waived: "secondary",
};
const VND = (n: number) => n.toLocaleString("vi-VN") + " đ";

function FeesScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("__all__");
  const [type, setType] = useState<string>("__all__");
  const [detail, setDetail] = useState<FeeRow | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const qc = useQueryClient();

  const fn = useServerFn(listBqlFees);
  const key = ["bql-fees", projectId || "all", status, type];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fn({ data: {
      projectId: projectId || undefined,
      status: status !== "__all__" ? (status as any) : undefined,
      feeType: type !== "__all__" ? (type as any) : undefined,
    } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter((r) => r.apartment_code.toLowerCase().includes(n) || r.period.toLowerCase().includes(n) || r.project_name.toLowerCase().includes(n));
  }, [rows, q]);
  const totals = useMemo(() => {
    const total = filtered.reduce((s, r) => s + r.amount, 0);
    const paid = filtered.reduce((s, r) => s + r.paid_amount, 0);
    return { total, paid, due: total - paid };
  }, [filtered]);

  // Payments for selected fee
  const payFn = useServerFn(listBqlFeePayments);
  const { data: payData } = useQuery({
    queryKey: ["bql-fee-payments", detail?.id],
    queryFn: () => payFn({ data: { feeId: detail!.id } }),
    enabled: !!detail,
  });
  const detailPayments = payData?.rows ?? [];

  // Record payment
  const recordFn = useServerFn(recordBqlFeePayment);
  const recordMut = useMutation({
    mutationFn: recordFn,
    onSuccess: (res) => {
      toast.success(`Đã ghi nhận biên lai ${res.receiptNo}`);
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ["bql-fees"] });
      qc.invalidateQueries({ queryKey: ["bql-fee-payments", detail?.id] });
      setDetail((d) => d ? { ...d, paid_amount: res.newPaid, status: res.newStatus } : d);
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi ghi nhận"),
  });

  function submitPay(fd: FormData) {
    if (!detail) return;
    recordMut.mutate({ data: {
      feeId: detail.id,
      amount: Number(fd.get("amount") ?? 0),
      method: String(fd.get("method") ?? "vietqr") as any,
      reference: String(fd.get("reference") ?? "") || undefined,
    } });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Receipt className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Phí dịch vụ</h1>
          <p className="text-sm text-muted-foreground">Quản lý phí theo căn hộ, công nợ và thu tiền.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Tổng phải thu" value={VND(totals.total)} />
        <Stat label="Đã thu" value={VND(totals.paid)} tone="success" />
        <Stat label="Còn nợ" value={VND(totals.due)} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm căn hộ / kỳ phí…" className="pl-8 h-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại</SelectItem>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setQ(""); setStatus("__all__"); setType("__all__"); }}>
          <RotateCcw className="h-3.5 w-3.5" />Reset
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Căn hộ</th><th className="text-left p-2">Loại</th><th className="text-left p-2">Kỳ</th>
                <th className="text-right p-2">Phải thu</th><th className="text-right p-2">Đã thu</th>
                <th className="text-left p-2">Hạn</th><th className="text-left p-2">TT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có khoản phí nào.</td></tr>}
              {filtered.map((f) => (
                <tr key={f.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(f)}>
                  <td className="p-2 font-medium">{f.apartment_code}</td>
                  <td className="p-2">{TYPE_LABEL[f.fee_type] ?? f.fee_type}</td>
                  <td className="p-2">{f.period}</td>
                  <td className="p-2 text-right tabular-nums">{VND(f.amount)}</td>
                  <td className="p-2 text-right tabular-nums">{VND(f.paid_amount)}</td>
                  <td className="p-2 text-[12px]">{new Date(f.due_date).toLocaleDateString("vi-VN")}</td>
                  <td className="p-2"><Badge variant={STATUS_TONE[f.status]} className="text-[10px]">{STATUS_LABEL[f.status] ?? f.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>Phí {TYPE_LABEL[detail.fee_type] ?? detail.fee_type} · {detail.period}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-[13px]">
                <dl className="space-y-1.5">
                  <Row k="Căn hộ" v={detail.apartment_code} />
                  <Row k="Dự án" v={detail.project_name} />
                  <Row k="Phải thu" v={VND(detail.amount)} />
                  <Row k="Đã thu" v={VND(detail.paid_amount)} />
                  <Row k="Còn nợ" v={VND(detail.amount - detail.paid_amount)} />
                  <Row k="Hạn thu" v={new Date(detail.due_date).toLocaleDateString("vi-VN")} />
                  <Row k="Trạng thái" v={STATUS_LABEL[detail.status] ?? detail.status} />
                </dl>
                {detail.status !== "paid" && detail.status !== "waived" && (
                  <Button className="w-full" onClick={() => setPayOpen(true)}>
                    <Wallet className="h-4 w-4 mr-1.5" />Ghi nhận thanh toán
                  </Button>
                )}
                {detailPayments.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[12px] mb-1.5">Giao dịch ({detailPayments.length})</h4>
                    <ul className="space-y-1">
                      {detailPayments.map((p) => (
                        <li key={p.id} className="rounded border p-2 text-[12px]">
                          <div className="flex justify-between"><span className="font-medium">{VND(p.amount)} · {p.method}</span><span className="text-muted-foreground font-mono">{p.receipt_no}</span></div>
                          <div className="text-[11px] text-muted-foreground">{new Date(p.paid_at).toLocaleString("vi-VN")} {p.reference && `· ${p.reference}`}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ghi nhận thanh toán</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitPay(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="space-y-1"><Label>Số tiền (VND) *</Label>
              <Input name="amount" type="number" required defaultValue={detail ? detail.amount - detail.paid_amount : 0} />
            </div>
            <div className="space-y-1"><Label>Phương thức *</Label>
              <select name="method" required defaultValue="vietqr" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="vietqr">VietQR</option><option value="bank_transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option><option value="card">Thẻ</option><option value="wallet">Ví điện tử</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Mã giao dịch</Label><Input name="reference" placeholder="TXN..." /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={recordMut.isPending}>{recordMut.isPending ? "Đang lưu…" : "Ghi nhận"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-0.5 ${tone === "success" ? "text-success" : tone === "danger" ? "text-emergency" : ""}`}>{value}</p>
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}
