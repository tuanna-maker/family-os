import { createFileRoute } from "@tanstack/react-router";
import {
  OpsKpiStrip,
  SlaTicketsCard,
  OccupancyCard,
  FeeCollectionChart,
  ComplaintQueue,
  WorkOrdersTable,
} from "@/features/ops/dashboard/widgets";

export const Route = createFileRoute("/ops/")({
  head: () => ({ meta: [{ title: "Tổng quan vận hành — STOS Life" }] }),
  component: OpsDashboard,
});

function OpsDashboard() {
  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <OpsKpiStrip />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2"><SlaTicketsCard /></div>
        <OccupancyCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2"><FeeCollectionChart /></div>
        <ComplaintQueue />
      </div>
      <WorkOrdersTable />
    </div>
  );
}
