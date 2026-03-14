import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ReportSummaryBarProps {
  rowCount: number;
  branch?: string;
  department?: string;
  employeeName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  daysAhead?: number;
  extra?: string;
}

export function ReportSummaryBar({ rowCount, branch, department, employeeName, dateFrom, dateTo, daysAhead, extra }: ReportSummaryBarProps) {
  const chips: { label: string; value: string }[] = [];

  chips.push({ label: "Rows", value: String(rowCount) });

  if (branch && branch !== "all") chips.push({ label: "Location", value: branch });
  if (department && department !== "all") chips.push({ label: "Dept", value: department });
  if (employeeName) chips.push({ label: "Employee", value: employeeName });
  if (dateFrom) chips.push({ label: "From", value: format(dateFrom, "d MMM yyyy") });
  if (dateTo) chips.push({ label: "To", value: format(dateTo, "d MMM yyyy") });
  if (daysAhead) chips.push({ label: "Lookahead", value: `${daysAhead} days` });
  if (extra) chips.push({ label: "Filter", value: extra });

  return (
    <div className="flex gap-1.5 flex-wrap py-1">
      {chips.map((c) => (
        <Badge key={c.label} variant="secondary" className="text-[10px] font-normal gap-1">
          <span className="text-muted-foreground">{c.label}:</span> {c.value}
        </Badge>
      ))}
    </div>
  );
}
