import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useScopedCollection } from "@/lib/services";
import { useCollection } from "@/mock-data/store";
import type { Payment, Apartment, Fee } from "@/types/core";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CreditCard, Download } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/bql/thanh-toan")({
  head: () => ({ meta: [{ title: "Thanh toán — BQL" }] }),
  component: PaymentsScreen,
});

const VND = (n: number) => n.toLocaleString("vi-VN") + " đ";

function PaymentsScreen() {
  const payments = useScopedCollection<Payment>("payments");
  const apartments = useCollection<Apartment>("apartments");
  const fees = useCollection<Fee>("fees");
  const aptMap = useMemo(() => new Map(apartments.map((a) => [a.id, a.code])), [apartments]);
  const feeMap = useMemo(() => new Map(fees.map((f) => [f.id, f])), [fees]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Payment | null>(null);

  const sorted = [...payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const filtered = sorted.filter((p) => !q.trim() ||
    aptMap.get(p.apartmentId)?.toLowerCase().includes(q.toLowerCase()) ||
    p.receiptNo.toLowerCase().includes(q.toLowerCase()) ||
    p.reference?.toLowerCase().includes(q.toLowerCase()));

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><CreditCard className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Thanh toán</h1>
          <p className="text-xs text-muted-foreground">Sổ thu — đối soát giao dịch & biên lai.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Tổng thu" value={VND(total)} />
        <Stat label="Giao dịch" value={filtered.length.toString()} />
      </div>

      <div className="flex items-center gap-2 rounded-xl border bg-card/40 p-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm căn hộ / mã biên lai…" className="h-9 border-0 shadow-none focus-visible:ring-0" />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] text-muted-foreground uppercase border-b">
            <tr><th className="text-left p-2">Biên lai</th><th className="text-left p-2">Căn</th>
              <th className="text-right p-2">Số tiền</th><th className="text-left p-2">Phương thức</th>
              <th className="text-left p-2">Mã GD</th><th className="text-left p-2">Ngày</th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(p)}>
                <td className="p-2 font-mono text-[12px]">{p.receiptNo}</td>
                <td className="p-2">{aptMap.get(p.apartmentId) ?? "—"}</td>
                <td className="p-2 text-right tabular-nums font-semibold">{VND(p.amount)}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{p.method}</Badge></td>
                <td className="p-2 text-[11px] font-mono">{p.reference ?? "—"}</td>
                <td className="p-2 text-[11px]">{new Date(p.paidAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md w-full">
          {detail && (
            <>
              <SheetHeader><SheetTitle>Biên lai {detail.receiptNo}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border p-4 bg-muted/20 text-center">
                  <p className="text-[11px] text-muted-foreground uppercase">Đã thu</p>
                  <p className="text-3xl font-bold tabular-nums">{VND(detail.amount)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(detail.paidAt).toLocaleString("vi-VN")}</p>
                </div>
                <dl className="space-y-1.5 text-[13px]">
                  <Row k="Căn hộ" v={aptMap.get(detail.apartmentId) ?? "—"} />
                  <Row k="Phí" v={detail.feeId ? `${feeMap.get(detail.feeId)?.type ?? ""} · ${feeMap.get(detail.feeId)?.period ?? ""}` : "—"} />
                  <Row k="Phương thức" v={detail.method} />
                  <Row k="Mã GD" v={detail.reference ?? "—"} />
                  <Row k="Người nhận" v={detail.receivedBy ?? "—"} />
                </dl>
                <Button variant="outline" className="w-full" onClick={() => window.print()}><Download className="h-4 w-4 mr-1.5" />In biên lai</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-lg font-bold tabular-nums mt-0.5">{value}</p></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}
