import { Button } from "@/components/ui/button";
import { ActiveClockInConflictError } from "@/hooks/useTimeEntries";

/** Shown instead of the clock-in button when own clock-in status can't be confirmed. */
export function ClockStatusError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const conflict = error instanceof ActiveClockInConflictError;
  return (
    <div role="alert" className="text-center space-y-3">
      <p className="text-sm font-medium text-foreground">
        {conflict ? (error as Error).message : "We couldn't load your clock-in status. Please try again."}
      </p>
      {!conflict && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
