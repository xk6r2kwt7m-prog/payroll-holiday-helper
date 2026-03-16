/**
 * Minimal sync/status block for operational signals.
 * Admin-only — shows run sync, last sync timestamp, stats.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOperationalSignals } from "@/hooks/useOperationalSignals";
import { getSignalTagLabel } from "@/lib/signal-mapping";
import type { SyncResult } from "@/lib/operational-signals-sync";

export function OperationalSignalsSyncBlock() {
  const { signals, sourceBreakdown, tagBreakdown, runSync } = useOperationalSignals(true);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const handleSync = () => {
    runSync.mutate(undefined, {
      onSuccess: (result) => setLastSyncResult(result),
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Operational Signals</span>
            <Badge variant="outline" className="text-xs">{signals.length} total</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={runSync.isPending}
            className="gap-1.5 text-xs h-7"
          >
            <RefreshCw className={cn("h-3 w-3", runSync.isPending && "animate-spin")} />
            {runSync.isPending ? "Syncing..." : "Run Sync"}
          </Button>
        </div>

        {/* Last sync result */}
        {lastSyncResult && (
          <div className={cn(
            "rounded-lg border p-2.5 text-xs space-y-1",
            lastSyncResult.status === "completed"
              ? "border-success/30 bg-success/5"
              : "border-destructive/30 bg-destructive/5"
          )}>
            <div className="flex items-center gap-1.5">
              {lastSyncResult.status === "completed" ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
              <span className="font-medium">
                Last sync: {lastSyncResult.status === "completed" ? "Success" : "Failed"}
              </span>
            </div>
            <div className="text-muted-foreground">
              Processed: {lastSyncResult.totalProcessed} · Inserted: {lastSyncResult.totalInserted} · Errors: {lastSyncResult.totalErrors}
            </div>
            {lastSyncResult.sources.map(s => (
              <div key={s.name} className="text-muted-foreground pl-4">
                {s.name}: {s.processed} processed, {s.inserted} new, {s.skipped} skipped
              </div>
            ))}
            {lastSyncResult.error && (
              <div className="text-destructive">{lastSyncResult.error}</div>
            )}
          </div>
        )}

        {/* Source breakdown */}
        {Object.keys(sourceBreakdown).length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">By Source</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(sourceBreakdown).map(([source, count]) => (
                <Badge key={source} variant="outline" className="text-xs">
                  {source.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tag breakdown */}
        {Object.keys(tagBreakdown).length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">By Signal Tag</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(tagBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {getSignalTagLabel(tag)}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {signals.length === 0 && !lastSyncResult && (
          <p className="text-xs text-muted-foreground">
            No operational signals yet. Run a sync to populate from review insights and disciplinary records.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
