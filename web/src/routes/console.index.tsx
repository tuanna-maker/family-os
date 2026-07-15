import { createFileRoute } from "@tanstack/react-router";
import { KpiStrip } from "@/features/console/dashboard/KpiStrip";
import { GrowthChart } from "@/features/console/dashboard/GrowthChart";
import { ProjectTypeDonut } from "@/features/console/dashboard/ProjectTypeDonut";
import { AlertsPanel } from "@/features/console/dashboard/AlertsPanel";
import { PerformanceTriad } from "@/features/console/dashboard/PerformanceTriad";
import { EcosystemStrip } from "@/features/console/dashboard/EcosystemStrip";
import { ProjectMap } from "@/features/console/dashboard/ProjectMap";
import { FooterStats } from "@/features/console/dashboard/FooterStats";

export const Route = createFileRoute("/console/")({
  head: () => ({ meta: [{ title: "Tổng quan nền tảng — STOS Life" }] }),
  component: ConsoleDashboard,
});

function ConsoleDashboard() {
  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <KpiStrip />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2"><GrowthChart /></div>
        <div className="lg:col-span-1 grid grid-cols-1 gap-3">
          <ProjectTypeDonut />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2"><PerformanceTriad /></div>
        <div className="lg:col-span-1"><AlertsPanel /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">
        <EcosystemStrip />
        <ProjectMap />
      </div>
      <FooterStats />
    </div>
  );
}
