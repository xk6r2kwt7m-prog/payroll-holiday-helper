import { Calendar, Search, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";
import { SensitiveField } from "@/components/ui/sensitive-field";

interface PaymentRecord {
  id: string;
  employeeName: string;
  employeeId: string | null;
  department: string;
  hours: number;
  rate: number;
  total: number;
  holidayDate: string | null;
  periodName: string;
  notes: string | null;
}

interface HolidayPaymentHistoryProps {
  payments: PaymentRecord[];
  onEmployeeClick?: (employeeId: string) => void;
}

type SortField = "employee" | "date" | "hours" | "total";

export function HolidayPaymentHistory({ payments, onEmployeeClick }: HolidayPaymentHistoryProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(field === "employee"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments
      .filter(p => p.employeeName.toLowerCase().includes(q) || p.periodName.toLowerCase().includes(q))
      .sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "employee": cmp = a.employeeName.localeCompare(b.employeeName); break;
          case "date": cmp = (a.holidayDate || "").localeCompare(b.holidayDate || ""); break;
          case "hours": cmp = a.hours - b.hours; break;
          case "total": cmp = a.total - b.total; break;
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [payments, search, sortField, sortAsc]);

  const totalHours = filtered.reduce((s, p) => s + p.hours, 0);
  const totalPaid = filtered.reduce((s, p) => s + p.total, 0);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort(field)}>
      {children}
      <ArrowUpDown className={cn("ml-1 h-3 w-3", sortField === field ? "text-primary" : "text-muted-foreground")} />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Search + summary */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">{filtered.length} payments</span>
          <span className="font-medium text-primary">{formatHours(totalHours)} hrs</span>
          <span className="font-semibold">{formatCurrency(totalPaid)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead><SortHeader field="employee">Employee</SortHeader></TableHead>
                <TableHead>Payroll Period</TableHead>
                <TableHead className="text-right"><SortHeader field="date">Holiday Date</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="hours">Hours</SortHeader></TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right"><SortHeader field="total">Total</SortHeader></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const initials = p.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2);
                return (
                  <TableRow
                    key={p.id}
                    className={cn("transition-colors", p.employeeId && "cursor-pointer hover:bg-muted/50")}
                    onClick={() => p.employeeId && onEmployeeClick?.(p.employeeId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-sm">{p.employeeName}</span>
                          <Badge variant="secondary" className="text-[10px] ml-2 px-1.5 py-0">{p.department}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.periodName}</TableCell>
                    <TableCell className="text-right text-sm">
                      {p.holidayDate
                        ? new Date(p.holidayDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-primary">{formatHours(p.hours)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">£{p.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(p.total)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No holiday payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
