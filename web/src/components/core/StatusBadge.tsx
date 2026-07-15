import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-tint-green text-success border-success/20",
  warning: "bg-tint-orange text-warning border-warning/20",
  danger:  "bg-tint-pink text-emergency border-emergency/20",
  info:    "bg-tint-blue text-brand border-brand/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  const t = tone ?? inferTone(status);
  return (
    <Badge variant="outline" className={cn("font-medium border", TONE[t])}>
      <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5",
        t === "success" && "bg-success",
        t === "warning" && "bg-warning",
        t === "danger" && "bg-emergency",
        t === "info" && "bg-brand",
        t === "neutral" && "bg-muted-foreground",
      )} />
      {status}
    </Badge>
  );
}

function inferTone(s: string): Tone {
  const v = s.toLowerCase();
  if (["active", "occupied", "approved", "resolved", "paid"].includes(v)) return "success";
  if (["pending", "maintenance", "reserved", "in_progress"].includes(v)) return "warning";
  if (["suspended", "rejected", "vacant", "moved_out", "inactive"].includes(v)) return "danger";
  if (["info", "draft", "new"].includes(v)) return "info";
  return "neutral";
}
