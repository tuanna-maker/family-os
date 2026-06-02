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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportKpiCsv(r: OpsKpiReport) {
  const prev = r.previous;
  const lines: string[] = [];
  lines.push("Báo cáo KPI/SLA — Security Operations Center");
  lines.push(`Khoảng thời gian;${rangeLabel(r.range_days)}`);
  lines.push(`Đội/ca;${r.team ?? "Tất cả"}`);
  lines.push(`Xuất lúc;${new Date(r.generated_at).toLocaleString("vi-VN")}`);
  lines.push("");
  lines.push("Chỉ số tổng;Kỳ hiện tại;Kỳ trước");
  const rows: Array<[string, string | number, string | number]> = [
    ["Tổng sự cố", r.incidents_total, prev?.incidents_total ?? "—"],
    ["Đang mở", r.incidents_open, prev?.incidents_open ?? "—"],
    ["Đã xử lý", r.incidents_resolved, prev?.incidents_resolved ?? "—"],
    ["TB phản ứng", fmtMin(r.avg_resolution_minutes), prev ? fmtMin(prev.avg_resolution_minutes) : "—"],
    ["% đạt SLA toàn cục", r.sla_overall_pct === null ? "—" : `${r.sla_overall_pct}%`, prev?.sla_overall_pct === null || prev?.sla_overall_pct === undefined ? "—" : `${prev.sla_overall_pct}%`],
    ["Bảo vệ trực hôm nay", `${r.shifts_checked_in}/${r.shifts_today}`, "—"],
    ["Bảo vệ đang có ca", r.guards_on_duty, "—"],
    ["Lượt tuần tra hôm nay", r.patrol_logs_today, "—"],
    ["Điểm tuần tra hôm nay", r.patrol_points_today, "—"],
  ];
  for (const row of rows) lines.push(row.map(csvEscape).join(";"));

  lines.push("");
  lines.push("Bảng SLA theo mức độ");
  lines.push("Mức độ;Tổng;Đã xử lý;TB;P90;SLA mục tiêu (phút);Đạt SLA;% đạt SLA");
  for (const b of r.sla) {
    lines.push(
      [
        SEV_LABEL[b.severity] ?? b.severity,
        b.total,
        b.resolved,
        fmtMin(b.avg_response_minutes),
        fmtMin(b.p90_response_minutes),
        b.sla_target_minutes,
        b.within_sla,
        b.sla_pct === null ? "—" : `${b.sla_pct}%`,
      ]
        .map(csvEscape)
        .join(";"),
    );
  }

  if (prev?.sla?.length) {
    lines.push("");
    lines.push("Bảng SLA kỳ trước");
    lines.push("Mức độ;Tổng;Đã xử lý;TB;P90;% đạt SLA");
    for (const b of prev.sla) {
      lines.push(
        [
          SEV_LABEL[b.severity] ?? b.severity,
          b.total,
          b.resolved,
          fmtMin(b.avg_response_minutes),
          fmtMin(b.p90_response_minutes),
          b.sla_pct === null ? "—" : `${b.sla_pct}%`,
        ]
          .map(csvEscape)
          .join(";"),
      );
    }
  }

  // Prepend BOM so Excel detects UTF-8 (Vietnamese diacritics)
  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, `kpi-sla_${rangeLabel(r.range_days).replace(" ", "")}_${timestamp()}.csv`);
}

