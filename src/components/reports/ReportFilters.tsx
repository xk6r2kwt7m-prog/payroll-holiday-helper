import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  // Branch
  branches?: { branch: string; display_name: string }[];
  selectedBranch?: string;
  onBranchChange?: (v: string) => void;
  // Department
  departments?: string[];
  selectedDepartment?: string;
  onDepartmentChange?: (v: string) => void;
  // Date range
  showDateRange?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange?: (d: Date | undefined) => void;
  onDateToChange?: (d: Date | undefined) => void;
  // Days ahead (document expiry)
  showDaysAhead?: boolean;
  daysAhead?: number;
  onDaysAheadChange?: (v: string) => void;
  // Export
  onExport: () => void;
  exportDisabled?: boolean;
  rowCount?: number;
}

export function ReportFilters({
  branches, selectedBranch, onBranchChange,
  departments, selectedDepartment, onDepartmentChange,
  showDateRange, dateFrom, dateTo, onDateFromChange, onDateToChange,
  showDaysAhead, daysAhead, onDaysAheadChange,
  onExport, exportDisabled, rowCount,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {branches && onBranchChange && (
        <Select value={selectedBranch} onValueChange={onBranchChange}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Locations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {departments && onDepartmentChange && (
        <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showDateRange && onDateFromChange && onDateToChange && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dateFrom ? format(dateFrom, "d MMM yyyy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dateTo ? format(dateTo, "d MMM yyyy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </>
      )}

      {showDaysAhead && onDaysAheadChange && (
        <Select value={String(daysAhead)} onValueChange={onDaysAheadChange}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Next 7 days</SelectItem>
            <SelectItem value="14">Next 14 days</SelectItem>
            <SelectItem value="30">Next 30 days</SelectItem>
            <SelectItem value="60">Next 60 days</SelectItem>
            <SelectItem value="90">Next 90 days</SelectItem>
            <SelectItem value="365">Next 12 months</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button size="sm" variant="default" onClick={onExport} disabled={exportDisabled}>
        <Download className="h-3.5 w-3.5 mr-1" />
        Export CSV
        {rowCount !== undefined && rowCount > 0 && <span className="ml-1 text-xs opacity-70">({rowCount})</span>}
      </Button>
    </div>
  );
}
