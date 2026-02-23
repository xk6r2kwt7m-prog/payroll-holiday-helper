import { ArrowUpDown, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatHours, hoursToDays } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  totalAccrued: number;
  totalTaken: number;
  totalPaid: number;
  balance: number;
  entitlement: number;
}

interface HolidayComparisonTableProps {
  data: EmployeeSummary[];
}

type SortField = "name" | "accrued" | "taken" | "balance" | "paid";
type SortDirection = "asc" | "desc";

export function HolidayComparisonTable({ data }: HolidayComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = a.employeeName.localeCompare(b.employeeName);
        break;
      case "accrued":
        comparison = a.totalAccrued - b.totalAccrued;
        break;
      case "taken":
        comparison = a.totalTaken - b.totalTaken;
        break;
      case "balance":
        comparison = a.balance - b.balance;
        break;
      case "paid":
        comparison = a.totalPaid - b.totalPaid;
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-1 h-3 w-3",
        sortField === field ? "text-primary" : "text-muted-foreground"
      )} />
    </Button>
  );

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[250px]">
                <SortableHeader field="name">Employee</SortableHeader>
              </TableHead>
              <TableHead>Dept</TableHead>
              <TableHead className="text-right">
                <SortableHeader field="accrued">Accrued</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="taken">Taken</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="balance">Balance</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Entitlement</TableHead>
              <TableHead className="text-right">
                <SortableHeader field="paid">Total Paid</SortableHeader>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((emp) => {
              const isOverdrawn = emp.totalTaken > emp.totalAccrued;
              const isUnderused = emp.totalAccrued > 0 && emp.totalTaken < emp.totalAccrued * 0.5;
              const usagePercent = emp.entitlement > 0 
                ? ((emp.totalTaken / emp.entitlement) * 100).toFixed(0) 
                : "0";
              
              const initials = emp.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2);

              return (
                <TableRow key={emp.employeeId} className="transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {emp.department}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-success">
                    <div>{formatHours(emp.totalAccrued)} hrs</div>
                    <div className="text-[10px] text-muted-foreground/70 font-normal">{hoursToDays(emp.totalAccrued)} days</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-primary">
                    {formatHours(emp.totalTaken)} hrs
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-semibold",
                    emp.balance >= 0 ? "text-accent" : "text-destructive"
                  )}>
                    {emp.balance >= 0 ? "+" : ""}{formatHours(emp.balance)} hrs
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatHours(emp.entitlement)} hrs
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(emp.totalPaid)}
                  </TableCell>
                  <TableCell className="text-center">
                    {isOverdrawn ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdrawn
                      </Badge>
                    ) : isUnderused ? (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Low ({usagePercent}%)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        OK ({usagePercent}%)
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
