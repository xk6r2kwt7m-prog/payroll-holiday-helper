import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type DepartmentType = Database["public"]["Enums"]["department_type"];
type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

interface ParsedEmployee {
  forename: string;
  surname: string;
  department: DepartmentType;
  status: EmployeeStatus;
  hourly_rate: number;
  service_charge: number;
  timesheet_hours: number;
  performance_bonus: number;
  special_bonus: number;
  total_pay: number;
}

interface ImportDialogProps {
  onImportComplete?: () => void;
}

export function ImportPayrollDialog({ onImportComplete }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payDate, setPayDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  
  const queryClient = useQueryClient();

  // Demo data based on actual Excel file
  const demoEmployees: ParsedEmployee[] = [
    { forename: "Lissette", surname: "Paredes", department: "FOH", status: "active", hourly_rate: 12.21, service_charge: 4.00, timesheet_hours: 196.98, performance_bonus: 150.00, special_bonus: 0, total_pay: 3343.05 },
    { forename: "Afonso", surname: "Gomes", department: "FOH", status: "active", hourly_rate: 11.00, service_charge: 1.00, timesheet_hours: 145.99, performance_bonus: 0, special_bonus: 0, total_pay: 1751.88 },
    { forename: "Kazumi", surname: "Ortega", department: "FOH", status: "active", hourly_rate: 12.21, service_charge: 1.00, timesheet_hours: 117.75, performance_bonus: 50.00, special_bonus: 0, total_pay: 1605.48 },
    { forename: "Marco", surname: "Ribeiro", department: "FOH", status: "active", hourly_rate: 13.00, service_charge: 2.50, timesheet_hours: 247.35, performance_bonus: 120.00, special_bonus: 0, total_pay: 3953.92 },
    { forename: "Ada", surname: "Feliz", department: "BOH", status: "active", hourly_rate: 12.21, service_charge: 3.00, timesheet_hours: 132.46, performance_bonus: 100.00, special_bonus: 0, total_pay: 2114.72 },
    { forename: "Hafiz", surname: "Rahim", department: "BOH", status: "active", hourly_rate: 14.50, service_charge: 0.50, timesheet_hours: 242.69, performance_bonus: 120.00, special_bonus: 0, total_pay: 3760.35 },
    { forename: "Sultan", surname: "Al Mabrur", department: "BOH", status: "active", hourly_rate: 12.21, service_charge: 1.50, timesheet_hours: 286.88, performance_bonus: 120.00, special_bonus: 0, total_pay: 4053.12 },
    { forename: "Fatima", surname: "Ashraf", department: "CPU", status: "active", hourly_rate: 12.21, service_charge: 0, timesheet_hours: 172.11, performance_bonus: 0, special_bonus: 80.00, total_pay: 2101.46 },
    { forename: "Wing", surname: "Wing", department: "CPU", status: "active", hourly_rate: 12.21, service_charge: 2.00, timesheet_hours: 239.74, performance_bonus: 80.00, special_bonus: 0, total_pay: 3486.71 },
    { forename: "Karl Ted", surname: "Ledesma", department: "FOH", status: "starter", hourly_rate: 12.50, service_charge: 1.00, timesheet_hours: 18.86, performance_bonus: 0, special_bonus: 0, total_pay: 254.61 },
  ];

  const handleImport = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setImporting(true);
    setImportStatus("idle");

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create payroll period
      const { data: period, error: periodError } = await supabase
        .from("payroll_periods")
        .insert({
          period_name: periodName,
          start_date: startDate,
          end_date: endDate,
          pay_date: payDate || null,
          status: "draft" as const,
          imported_by: user?.id,
        })
        .select()
        .single();

      if (periodError) throw periodError;

      let employeesCreated = 0;
      let entriesCreated = 0;

      // Process each employee
      for (const emp of demoEmployees) {
        // Check if employee exists
        let { data: existingEmployee } = await supabase
          .from("employees")
          .select("id")
          .eq("forename", emp.forename)
          .eq("surname", emp.surname)
          .maybeSingle();

        let employeeId: string;

        if (!existingEmployee) {
          // Create new employee
          const { data: newEmployee, error: empError } = await supabase
            .from("employees")
            .insert({
              forename: emp.forename,
              surname: emp.surname,
              department: emp.department,
              status: emp.status,
              hourly_rate: emp.hourly_rate,
              service_charge: emp.service_charge,
            })
            .select()
            .single();

          if (empError) throw empError;
          employeeId = newEmployee.id;
          employeesCreated++;
        } else {
          employeeId = existingEmployee.id;
        }

        // Create payroll entry
        const { error: entryError } = await supabase
          .from("payroll_entries")
          .insert({
            payroll_period_id: period.id,
            employee_id: employeeId,
            hourly_rate: emp.hourly_rate,
            service_charge: emp.service_charge,
            timesheet_hours: emp.timesheet_hours,
            performance_bonus: emp.performance_bonus,
            special_bonus: emp.special_bonus,
            total_pay: emp.total_pay,
          });

        if (entryError) throw entryError;
        entriesCreated++;
      }

      // Update period totals
      const totalTimesheet = demoEmployees.reduce((sum, e) => sum + e.total_pay, 0);
      const totalBonuses = demoEmployees.reduce((sum, e) => sum + e.performance_bonus + e.special_bonus, 0);

      await supabase
        .from("payroll_periods")
        .update({
          timesheet_total: totalTimesheet,
          incentives_total: totalBonuses,
          grand_total: totalTimesheet,
        })
        .eq("id", period.id);

      // Create import record
      await supabase
        .from("payroll_imports")
        .insert({
          payroll_period_id: period.id,
          file_name: file?.name || "Demo Import",
          imported_by: user?.id,
          import_status: "completed",
          records_imported: entriesCreated,
        });

      setImportStatus("success");
      setImportMessage(`Successfully imported ${entriesCreated} payroll entries. ${employeesCreated} new employees created.`);
      
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      
      toast.success("Payroll imported successfully!");
      onImportComplete?.();
      
      // Reset form after success
      setTimeout(() => {
        setOpen(false);
        setFile(null);
        setPeriodName("");
        setStartDate("");
        setEndDate("");
        setPayDate("");
        setImportStatus("idle");
      }, 2000);

    } catch (error) {
      console.error("Import error:", error);
      setImportStatus("error");
      setImportMessage(error instanceof Error ? error.message : "Failed to import payroll");
      toast.error("Failed to import payroll");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <Upload className="mr-2 h-4 w-4" />
          Import Payroll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Payroll Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="periodName">Period Name *</Label>
            <Input
              id="periodName"
              placeholder="e.g., January 2026"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payDate">Pay Date</Label>
            <Input
              id="payDate"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Spreadsheet File (optional)</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Upload an Excel file from your payroll system. For demo, we'll use sample data.
            </p>
          </div>

          {importStatus === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
              <CheckCircle className="h-5 w-5" />
              <p className="text-sm">{importMessage}</p>
            </div>
          )}

          {importStatus === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5" />
              <p className="text-sm">{importMessage}</p>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
            <AlertCircle className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Imported data will be saved as <strong>Draft</strong>. Review and approve after import.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importing || !periodName || !startDate || !endDate}
          >
            {importing ? "Importing..." : "Import Payroll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
