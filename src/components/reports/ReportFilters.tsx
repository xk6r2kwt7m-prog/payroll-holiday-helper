import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EmployeeOption {
  id: string;
  forename: string;
  surname: string;
  department: string;
}

interface ReportFiltersProps {
  // Branch
  branches?: { branch: string; display_name: string }[];
  selectedBranch?: string;
  onBranchChange?: (v: string) => void;
  // Department
  departments?: string[];
  selectedDepartment?: string;
  onDepartmentChange?: (v: string) => void;
  // Employee
  employees?: EmployeeOption[];
  selectedEmployeeId?: string;
  onEmployeeChange?: (v: string) => void;
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
  employees: employeeOptions, selectedEmployeeId, onEmployeeChange,
  showDateRange, dateFrom, dateTo, onDateFromChange, onDateToChange,
  showDaysAhead, daysAhead, onDaysAheadChange,
  onExport, exportDisabled, rowCount,
}: ReportFiltersProps) {
  const [empSearch, setEmpSearch] = useState("");
  const [empOpen, setEmpOpen] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!employeeOptions) return [];
    if (!empSearch) return employeeOptions;
    const q = empSearch.toLowerCase();
    return employeeOptions.filter(
      (e) => `${e.forename} ${e.surname}`.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    );
  }, [employeeOptions, empSearch]);

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

      {employeeOptions && onEmployeeChange && (
        <Popover open={empOpen} onOpenChange={setEmpOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal text-xs", !selectedEmployeeId || selectedEmployeeId === "all" ? "text-muted-foreground" : "")}>
              <Search className="mr-1 h-3 w-3 shrink-0" />
              {selectedEmployeeId && selectedEmployeeId !== "all"
                ? (() => {
                    const emp = employeeOptions.find((e) => e.id === selectedEmployeeId);
                    return emp ? `${emp.forename} ${emp.surname}`.substring(0, 18) : "Employee";
                  })()
                : "All Employees"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2" align="start">
            <Input
              placeholder="Search employees…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="h-8 text-xs mb-2"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              <button
                type="button"
                className={cn("w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent", (!selectedEmployeeId || selectedEmployeeId === "all") && "bg-accent font-medium")}
                onClick={() => { onEmployeeChange("all"); setEmpOpen(false); setEmpSearch(""); }}
              >
                All Employees
              </button>
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  className={cn("w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent", selectedEmployeeId === emp.id && "bg-accent font-medium")}
                  onClick={() => { onEmployeeChange(emp.id); setEmpOpen(false); setEmpSearch(""); }}
                >
                  {emp.forename} {emp.surname}
                  <span className="ml-1 text-muted-foreground">· {emp.department}</span>
                </button>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No match</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
