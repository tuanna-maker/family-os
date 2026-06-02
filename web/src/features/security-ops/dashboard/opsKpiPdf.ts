import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { OpsKpiReport } from "@/lib/security.functions";

const SEV_LABEL: Record<string, string> = {
  critical: "P1 · Critical",
  high: "P2 · High",
  medium: "P3 · Medium",
  low: "P4 · Low",
};

function fmtMin(m: number | null): string {
  if (m === null) return "—";
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${m.toFixed(1)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

function rangeLabel(days: number) {
  return days === 1 ? "24h" : `${days} ngày`;
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function exportKpiPdf(r: OpsKpiReport) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const prev = r.previous;

  doc.setFontSize(16);
  doc.text("Bao cao KPI / SLA - Security Operations Center", 40, 50);

  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    `Khoang: ${rangeLabel(r.range_days)}  |  Doi/ca: ${r.team ?? "Tat ca"}  |  Xuat luc: ${new Date(r.generated_at).toLocaleString("vi-VN")}`,
    40,
    70,
  );
  doc.setTextColor(0);

  const fmtDelta = (cur: number | null, p: number | null) => {
    if (cur === null || p === null) return "—";
    if (p === 0) return cur === 0 ? "0%" : "—";
    const d = Math.round(((cur - p) / p) * 1000) / 10;
    return `${d > 0 ? "+" : ""}${d}%`;
  };

  autoTable(doc, {
    startY: 90,
    head: [["Chi so", "Ky hien tai", "Ky truoc", "Bien dong"]],
    body: [
      ["Tong su co", r.incidents_total, prev?.incidents_total ?? "—", fmtDelta(r.incidents_total, prev?.incidents_total ?? null)],
      ["Dang mo", r.incidents_open, prev?.incidents_open ?? "—", fmtDelta(r.incidents_open, prev?.incidents_open ?? null)],
      ["Da xu ly", r.incidents_resolved, prev?.incidents_resolved ?? "—", fmtDelta(r.incidents_resolved, prev?.incidents_resolved ?? null)],
      ["TB phan ung", fmtMin(r.avg_resolution_minutes), prev ? fmtMin(prev.avg_resolution_minutes) : "—", fmtDelta(r.avg_resolution_minutes, prev?.avg_resolution_minutes ?? null)],
      ["% dat SLA toan cuc", r.sla_overall_pct === null ? "—" : `${r.sla_overall_pct}%`, prev?.sla_overall_pct === null || prev?.sla_overall_pct === undefined ? "—" : `${prev.sla_overall_pct}%`, fmtDelta(r.sla_overall_pct, prev?.sla_overall_pct ?? null)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  const slaY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text("SLA theo muc do", 40, slaY);

  const prevMap = new Map((prev?.sla ?? []).map((b) => [b.severity, b]));
  autoTable(doc, {
    startY: slaY + 10,
    head: [["Muc do", "Tong", "Da xu ly", "TB", "P90", "Muc tieu", "% dat SLA", "vs ky truoc"]],
    body: r.sla.map((b) => {
      const pb = prevMap.get(b.severity);
      return [
        SEV_LABEL[b.severity] ?? b.severity,
        b.total,
        b.resolved,
        fmtMin(b.avg_response_minutes),
        fmtMin(b.p90_response_minutes),
        `<= ${b.sla_target_minutes}m`,
        b.sla_pct === null ? "—" : `${b.sla_pct}%`,
        fmtDelta(b.sla_pct, pb?.sla_pct ?? null),
      ];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  const opsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text("Hoat dong hom nay", 40, opsY);
  autoTable(doc, {
    startY: opsY + 10,
    head: [["Chi so", "Gia tri"]],
    body: [
      ["Bao ve check-in / tong ca", `${r.shifts_checked_in} / ${r.shifts_today}`],
      ["Bao ve dang co ca", r.guards_on_duty],
      ["Luot tuan tra", r.patrol_logs_today],
      ["Diem tuan tra khac nhau", r.patrol_points_today],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  doc.setFontSize(8);
  doc.setTextColor(140);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Trang ${i}/${pageCount} - SOC KPI Report`, 40, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`kpi-sla_${rangeLabel(r.range_days).replace(" ", "")}_${timestamp()}.pdf`);
}
