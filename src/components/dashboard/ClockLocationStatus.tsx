import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "loading" | "granted" | "denied" | "unavailable";

export function ClockLocationStatus({ status, distance, radius }: {
  status: Status;
  distance?: number | null;
  radius?: number | null;
}) {
  const inRange = status === "granted" && distance != null && radius != null && distance <= radius;
  const message = status === "loading" ? "Checking location…" : status === "granted"
    ? distance == null || radius == null ? "Location cannot be checked against this site; a manager will review it"
      : inRange ? "Near the selected workplace" : `${Math.round(distance)}m from the selected workplace`
    : "Location unavailable. You may clock in; a manager will review it";

  return <div role="status" className="rounded-lg bg-muted/50 px-3 py-2 text-center text-xs">
    <div className="flex items-center justify-center gap-2">
      <Navigation className={cn("h-3.5 w-3.5", inRange ? "text-success" : "text-warning")} />
      <span className={cn("font-medium", inRange ? "text-success" : "text-foreground")}>{message}</span>
    </div>
  </div>;
}
