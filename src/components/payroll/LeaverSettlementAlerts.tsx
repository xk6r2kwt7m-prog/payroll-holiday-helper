import { AlertTriangle, UserMinus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { useLeaverSettlementCandidates } from "@/hooks/useLeaverSettlementCandidates";
import { HOLIDAY_DISPLAY_LABELS } from "@/lib/holiday-display-labels";

interface Props {
  periodId?: string;
  periodEndDate?: string;
  periodName?: string;
  entries?: any[];
}

/**
 * READ-ONLY banner: lists leavers in this period whose remaining holiday
 * balance > 0 and who have no `payout_on_termination` ledger row.
 * The banner does not mutate anything — it points the admin at the
 * Settle Leaver flow.
 */
export function LeaverSettlementAlerts({
  periodId,
  periodEndDate,
  periodName,
  entries,
}: Props) {
  const { data: candidates } = useLeaverSettlementCandidates({
    periodId,
    periodEndDate,
    entries,
  });

  if (!candidates || candidates.length === 0) return null;

  return (
    <Alert
      className="border-warning/40 bg-warning/5"
      data-testid="leaver-settlement-alerts"
    >
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-sm font-semibold">
        {candidates.length === 1
          ? "1 leaver has an unsettled holiday balance"
          : `${candidates.length} leavers have unsettled holiday balances`}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2 text-xs">
        <p className="text-muted-foreground">
          {HOLIDAY_DISPLAY_LABELS.leaverSettlementCta}
          {periodName ? ` Suggested settlement period: ${periodName}.` : ""}
        </p>
        <ul className="space-y-1.5">
          {candidates.map((c) => (
            <li
              key={c.employeeId}
              className="flex flex-wrap items-center gap-2 rounded-md bg-background/60 px-2 py-1.5"
              data-testid={`leaver-candidate-${c.employeeId}`}
            >
              <UserMinus className="h-3 w-3 text-warning shrink-0" />
              <span className="font-medium">{c.employeeName || "—"}</span>
              <Badge variant="outline" className="text-[10px]">
                Ends {new Date(c.endDate).toLocaleDateString("en-GB")}
              </Badge>
              <span className="text-muted-foreground">
                {formatHours(c.remainingHours)}h available · estimated{" "}
                {formatCurrency(c.estimatedValue)}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-warning">
                {HOLIDAY_DISPLAY_LABELS.notPaidYet}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
