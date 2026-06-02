import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Siren, MapPin, Clock, Users, RefreshCw } from "lucide-react";
import { listOpenSos, type OpenSosRow } from "@/lib/security.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SosTicketDrawer } from "./SosTicketDrawer";
import { useSosOpsStream } from "./use-sos-ops-stream";

const PRIORITY_CLS: Record<string, string> = {
  P1: "border-red-500/60 bg-red-500/15 text-red-600 dark:text-red-300",
  P2: "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  P3: "border-sky-500/60 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "—": "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  in_progress: "Đang xử lý",
};

function formatAge(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h${rm}m` : `${h}h`;
}

function ageTone(sec: number, priority: string) {
  const slaSec = priority === "P1" ? 120 : priority === "P2" ? 600 : 1800;
  if (sec > slaSec) return "text-red-500";
  if (sec > slaSec * 0.7) return "text-amber-500";
  return "text-muted-foreground";
}

export function OpenSosCard() {
  const fetchFn = useServerFn(listOpenSos);
  const { data, isLoading, refetch, isFetching } = useQuery<OpenSosRow[]>({
    queryKey: ["open-sos"],
    queryFn: () => fetchFn(),
    // Realtime drives invalidation; keep a long safety-net poll only.
    refetchInterval: 60_000,
  });
  const [selected, setSelected] = useState<OpenSosRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Shared ref-counted realtime channel (merged with DispatchAssignmentsCard)
  useSosOpsStream();




  const rows = data ?? [];
  const counts = rows.reduce(
    (acc, r) => {
      acc.total++;
      if (r.priority === "P1" || r.priority === "P2" || r.priority === "P3") acc[r.priority]++;
      return acc;
    },
    { total: 0, P1: 0, P2: 0, P3: 0 } as Record<string, number>,
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm font-semibold">SOS đang mở</CardTitle>
          <Badge variant="outline" className="text-[10px]">{counts.total}</Badge>
          {counts.P1 > 0 && (
            <Badge className={`text-[10px] ${PRIORITY_CLS.P1}`} variant="outline">
              P1 · {counts.P1}
            </Badge>
          )}
          {counts.P2 > 0 && (
            <Badge className={`text-[10px] ${PRIORITY_CLS.P2}`} variant="outline">
              P2 · {counts.P2}
            </Badge>
          )}
          {counts.P3 > 0 && (
            <Badge className={`text-[10px] ${PRIORITY_CLS.P3}`} variant="outline">
              P3 · {counts.P3}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Không có SOS nào đang mở.
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => { setSelected(r); setDrawerOpen(true); }}
                className="w-full py-2.5 flex items-center gap-3 text-sm text-left hover:bg-muted/40 rounded px-1 -mx-1 transition"
              >
                <Badge
                  variant="outline"
                  className={`shrink-0 font-semibold ${PRIORITY_CLS[r.priority]}`}
                >
                  {r.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.incident_type}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {r.ticket_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[r.zone, r.location].filter(Boolean).join(" · ") || "—"}
                    </span>
                    {r.team_name && (
                      <span className="flex items-center gap-1 truncate">
                        <Users className="h-3 w-3" />
                        {r.team_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`flex items-center gap-1 text-xs font-medium ${ageTone(r.age_seconds, r.priority)}`}>
                    <Clock className="h-3 w-3" />
                    {formatAge(r.age_seconds)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
      <SosTicketDrawer row={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </Card>
  );
}
