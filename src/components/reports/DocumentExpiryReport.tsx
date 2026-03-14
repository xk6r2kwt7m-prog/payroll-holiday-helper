import { useState, useMemo } from "react";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { useAllExpiringDocuments, getExpiryStatus } from "@/hooks/useEmployeeDocuments";
import { useEmployees } from "@/hooks/useEmployees";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

export function DocumentExpiryReport() {
  const [daysAhead, setDaysAhead] = useState(30);
  const [dept, setDept] = useState("all");

  const { data: docs = [], isLoading } = useAllExpiringDocuments(daysAhead);
  const { data: employees } = useEmployees();

  const departments = useMemo(() => {
    if (!employees) return [];
    return [...new Set(employees.map((e) => e.department))].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let list = docs as any[];
    if (dept !== "all") list = list.filter((d: any) => d.employees?.department === dept);
    return list;
  }, [docs, dept]);

  const handleExport = () => {
    exportToCsv(`document_expiry_${daysAhead}d`, [
      { header: "Employee", accessor: (r: any) => `${r.employees?.forename || ""} ${r.employees?.surname || ""}` },
      { header: "Department", accessor: (r: any) => r.employees?.department },
      { header: "Document Name", accessor: (r: any) => r.document_name },
      { header: "Document Type", accessor: (r: any) => r.document_type },
      { header: "Expiry Date", accessor: (r: any) => r.expires_at },
      { header: "Status", accessor: (r: any) => getExpiryStatus(r.expires_at).status },
      { header: "Days Until Expiry", accessor: (r: any) => getExpiryStatus(r.expires_at).daysUntil },
    ], filtered);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Document Expiry Report</CardTitle>
        <ReportFilters
          departments={departments}
          selectedDepartment={dept}
          onDepartmentChange={setDept}
          showDaysAhead
          daysAhead={daysAhead}
          onDaysAheadChange={(v) => setDaysAhead(Number(v))}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          rowCount={filtered.length}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No expiring documents" description="No documents are expiring within the selected timeframe." compact />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d: any) => {
                  const exp = getExpiryStatus(d.expires_at);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-xs">{d.employees?.forename} {d.employees?.surname}</TableCell>
                      <TableCell className="text-xs">{d.document_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs capitalize">{d.document_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs">{d.expires_at ? format(new Date(d.expires_at), "d MMM yyyy") : "–"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", {
                          "text-destructive border-destructive/30": exp.status === "expired",
                          "text-warning border-warning/30": exp.status === "expiring",
                          "text-success border-success/30": exp.status === "valid",
                        })}>{exp.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
