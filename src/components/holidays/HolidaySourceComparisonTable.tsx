import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import type { SourceRow, MismatchReport } from "@/lib/holiday-entitlement-basis";

interface Props {
  rows: SourceRow[];
  mismatch: MismatchReport;
  onInvestigate?: () => void;
}

export function HolidaySourceComparisonTable({ rows, mismatch, onInvestigate }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Source comparison</p>
        {onInvestigate && (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onInvestigate}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Investigate Ledger
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left py-1.5 px-2 font-medium">Source</th>
              <th className="text-right py-1.5 px-2 font-medium">Accrued</th>
              <th className="text-right py-1.5 px-2 font-medium">Carry</th>
              <th className="text-right py-1.5 px-2 font-medium">Taken</th>
              <th className="text-right py-1.5 px-2 font-medium">Paid £</th>
              <th className="text-right py-1.5 px-2 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className={cn("border-b border-border last:border-0", r.missing && "opacity-60")}>
                <td className="py-1.5 px-2 text-foreground">{r.label}{r.missing && " (no data)"}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatHours(r.accrued)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatHours(r.carryOver)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatHours(r.taken)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(r.paid)}</td>
                <td
                  className={cn(
                    "py-1.5 px-2 text-right font-mono font-semibold",
                    r.balance < 0 ? "text-destructive" : r.balance > 0 ? "text-warning" : "text-success"
                  )}
                >
                  {formatHours(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mismatch.hasMismatch && (
        <div className="rounded-md bg-warning/10 border border-warning/30 p-2 text-[11px] text-warning flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="space-y-1 min-w-0">
            <p className="font-semibold">Holiday balance mismatch detected. Please review before settling this employee.</p>
            <ul className="list-disc pl-4 space-y-0.5 text-foreground">
              {mismatch.pairs.slice(0, 4).map((p, i) => (
                <li key={i}>
                  <code className="text-[10px]">{p.a}</code> vs <code className="text-[10px]">{p.b}</code> ·{" "}
                  <span className="text-muted-foreground">{p.field}</span> differs by{" "}
                  <span className="font-mono">{formatHours(p.delta)}</span>
                </li>
              ))}
              {mismatch.pairs.length > 4 && (
                <li className="text-muted-foreground">…and {mismatch.pairs.length - 4} more.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
