import { MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEmployeeLocationSplit } from "@/hooks/usePayrollLocations";
import { formatHours } from "@/hooks/useHolidays";

interface Props {
  periodId: string;
  employeeId: string;
  employeeName: string;
}

export function LocationSplitPopover({ periodId, employeeId, employeeName }: Props) {
  const { data: splits = [], isLoading } = useEmployeeLocationSplit(periodId, employeeId);

  if (splits.length === 0 && !isLoading) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
          <MapPin className="h-3 w-3" />
          {splits.length > 1 && (
            <span className="text-[10px] font-medium">{splits.length}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-xs font-semibold text-foreground mb-2">
          {employeeName} — Location Split
        </p>
        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {splits.map((split) => (
              <div key={split.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-medium truncate">{split.location_name}</span>
                  {split.department && (
                    <Badge variant="secondary" className="text-[9px] shrink-0">{split.department}</Badge>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground shrink-0">
                  {formatHours(Number(split.hours))}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-1 border-t border-border">
              <span className="text-[10px] text-muted-foreground">Total</span>
              <span className="text-xs font-bold text-foreground">
                {formatHours(splits.reduce((s, l) => s + Number(l.hours), 0))}
              </span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
