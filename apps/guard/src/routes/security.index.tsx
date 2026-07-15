import { createFileRoute } from "@tanstack/react-router";
import {
  SecurityKpiStrip,
  GuardsOnlineCard,
  PatrolMapCard,
  QrScanChart,
  IncidentQueueCard,
  AccessBreakdownCard,
  PatrolCompletionCard,
} from "@/features/security-ops/dashboard/widgets";
import { SosDispatchButton } from "@/features/security-ops/dashboard/SosDispatchButton";
import { PatrolScheduleCard } from "@/features/security-ops/dashboard/PatrolScheduleCard";
import { DispatchAssignmentsCard } from "@/features/security-ops/dashboard/DispatchAssignmentsCard";
import { OpenSosCard } from "@/features/security-ops/dashboard/OpenSosCard";

export const Route = createFileRoute("/security/")({
  head: () => ({ meta: [{ title: "Security Operations Center — STOS Life" }] }),
  component: SecurityDashboard,
});

function SecurityDashboard() {
  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Security Operations Center</h1>
          <p className="text-xs text-muted-foreground">Giám sát lực lượng, sự cố và tuần tra theo thời gian thực.</p>
        </div>
        <SosDispatchButton />
      </div>
      <SecurityKpiStrip />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <OpenSosCard />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PatrolMapCard />
        <GuardsOnlineCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <IncidentQueueCard />
        <DispatchAssignmentsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <AccessBreakdownCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PatrolScheduleCard />
        <PatrolCompletionCard />
      </div>

      <div className="grid grid-cols-1 gap-5">
        <QrScanChart />
      </div>
    </div>
  );
}
