import { useState, useCallback, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, UserPlus, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { calculateHolidayAccrual } from "@/hooks/useHolidays";
import type { Database } from "@/integrations/supabase/types";

type DepartmentType = Database["public"]["Enums"]["department_type"];

// ─── Name mapping: CSV first name → DB employee match ───
// This resolves informal names, nicknames, and abbreviations
const NAME_MAP: Record<string, { forename: string; surname: string }> = {
  "sai": { forename: "Saicharan", surname: "Manepalli" },
  "maria": { forename: "Iara Maria", surname: "Moniz Ferreira" },
  "ruben": { forename: "Rubem", surname: "Pereira" },
  "vicky": { forename: "Viktoriia", surname: "Bastrakova" },
  "aris feliz": { forename: "Arisnorky", surname: "Feliz" },
  "joselin chala": { forename: "Jocelyne", surname: "Chala" },
  "jie-en": { forename: "Jie En", surname: "Loh" },
  "kitty": { forename: "Kitty", surname: "Oil Lan" },
  "ling chak": { forename: "Ling", surname: "Chak" },
  "nairobis de los sant…": { forename: "Nairobys", surname: "De los Santos" },
  "nairobis de los sant": { forename: "Nairobys", surname: "De los Santos" },
  "rehana": { forename: "Rheana", surname: "Rahim" },
  "sam": { forename: "Samnath", surname: "Thembareni" },
  "sreeja": { forename: "Sreeja", surname: "Vadlapudi" },
  "wing lee": { forename: "Wing", surname: "Lee" },
  "hafiz abdur rahim": { forename: "Hafiz", surname: "Rahim" },
  "luisa valenzuela": { forename: "Luisa", surname: "Valenzuela" },
  "nishanth thota": { forename: "Nishanth", surname: "Thota" },
  "arun kumar": { forename: "Arun", surname: "Thota" },
  "rithwik godishala": { forename: "Rithwik", surname: "Godishala" },
  "adriana baca": { forename: "Adriana", surname: "Baca" },
  "karl": { forename: "Karl Ted", surname: "Ledesma" },
  "daniela": { forename: "Daniela Patricia", surname: "Da Costa Almeida" },
  "sultan": { forename: "Sultan", surname: "Al Mabrur" },
  "ada": { forename: "Ada", surname: "Feliz" },
  "heidy": { forename: "Heidy", surname: "Ramos" },
  "marco": { forename: "Marco", surname: "Ribeiro" },
  "steven": { forename: "Steven", surname: "Cumba" },
  "afonso": { forename: "Afonso", surname: "Gomes" },
  "lissette": { forename: "Lissette", surname: "Paredes" },
  "wakako": { forename: "Wakako", surname: "Ashida" },
  "kazumi": { forename: "Kazumi", surname: "Ortega" },
  "fatima": { forename: "Fatima", surname: "Ashraf" },
  "varsha": { forename: "Varsha", surname: "Kumari" },
};

// Section → location mapping for notes
const SECTION_LOCATION_MAP: Record<string, string> = {
  "[BOH]BOH - Brixton": "Brixton (BOH)",
  "[FOH]FOH - Brixton": "Brixton (FOH)",
  "[RTD]KITCHEN": "CPU Kitchen",
  "[E98]FOH": "Fitzrovia (FOH)",
  "[YT5]30 Rathbone Place Ugly Dumpling WT 1JG,uk": "Fitzrovia (CPU)",
  "[KVQ]BOH": "Carnaby (BOH)",
  "[UGL]FOH": "Carnaby (FOH)",
};

// Section → department mapping
const SECTION_DEPT_MAP: Record<string, DepartmentType> = {
  "[BOH]BOH - Brixton": "BOH",
  "[FOH]FOH - Brixton": "FOH",
  "[RTD]KITCHEN": "BOH",
  "[E98]FOH": "FOH",
  "[YT5]30 Rathbone Place Ugly Dumpling WT 1JG,uk": "CPU",
  "[KVQ]BOH": "BOH",
  "[UGL]FOH": "FOH",
};

interface ParsedRow {
  csvName: string;
  hours: number;
  section: string;
  location: string;
}

interface AggregatedEmployee {
  csvName: string;
  totalHours: number;
  locations: { name: string; hours: number }[];
  matchedForename?: string;
  matchedSurname?: string;
  matchedId?: string;
  department?: DepartmentType;
  hourlyRate?: number;
  serviceCharge?: number;
  unmatched: boolean;
}

const SKIP_NAMES = new Set(["zak cope"]);

function parseTimesheetCSV(csvText: string): ParsedRow[] {
  const lines = csvText.split("\n");
  const rows: ParsedRow[] = [];
  let currentSection = "";

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect section headers (lines that start with a quote and contain a bracket code)
    const sectionMatch = line.match(/^\s*"?\s*(\[.+?\].+?)"?\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // Skip total rows and unpaid leave
    if (line.toLowerCase().includes("total for") || line.toLowerCase().includes("grand total") || line.toLowerCase().includes("unpaid leave")) continue;

    // Parse data row
    const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g);
    if (!cols || cols.length < 3) continue;

    const name = cols[0]?.replace(/"/g, "").trim();
    const timesheetHoursStr = cols[2]?.replace(/"/g, "").replace(/,/g, "").trim();

    if (!name || !currentSection) continue;
    if (name.toLowerCase().startsWith("total for")) continue;

    const hours = parseFloat(timesheetHoursStr) || 0;
    if (hours === 0 && timesheetHoursStr === "-") continue;

    const locationName = SECTION_LOCATION_MAP[currentSection] || currentSection;

    rows.push({
      csvName: name,
      hours,
      section: currentSection,
      location: locationName,
    });
  }
  return rows;
}

function aggregateByEmployee(
  rows: ParsedRow[],
  employees: { id: string; forename: string; surname: string; department: DepartmentType; hourly_rate: number; service_charge: number | null; status: string }[]
): AggregatedEmployee[] {
  const empMap = new Map<string, AggregatedEmployee>();

  for (const row of rows) {
    const nameLower = row.csvName.toLowerCase().trim();
    if (SKIP_NAMES.has(nameLower)) continue;

    // Resolve via name map first
    const mapped = NAME_MAP[nameLower];
    let matchKey: string;
    let matched = false;
    let matchedEmp: typeof employees[0] | undefined;

    if (mapped) {
      matchedEmp = employees.find(
        (e) => e.forename.toLowerCase() === mapped.forename.toLowerCase() && e.surname.toLowerCase() === mapped.surname.toLowerCase()
      );
      matchKey = mapped ? `${mapped.forename} ${mapped.surname}`.toLowerCase() : nameLower;
    } else {
      // Try direct forename match
      matchedEmp = employees.find(
        (e) => e.forename.toLowerCase() === nameLower || `${e.forename} ${e.surname}`.toLowerCase() === nameLower
      );
      matchKey = matchedEmp ? `${matchedEmp.forename} ${matchedEmp.surname}`.toLowerCase() : nameLower;
    }

    matched = !!matchedEmp;

    const existing = empMap.get(matchKey);
    if (existing) {
      existing.totalHours += row.hours;
      existing.locations.push({ name: row.location, hours: row.hours });
    } else {
      empMap.set(matchKey, {
        csvName: row.csvName,
        totalHours: row.hours,
        locations: [{ name: row.location, hours: row.hours }],
        matchedForename: matchedEmp?.forename || mapped?.forename,
        matchedSurname: matchedEmp?.surname || mapped?.surname,
        matchedId: matchedEmp?.id,
        department: matchedEmp?.department,
        hourlyRate: matchedEmp?.hourly_rate,
        serviceCharge: matchedEmp?.service_charge ?? 0,
        unmatched: !matched,
      });
    }
  }

  return Array.from(empMap.values()).sort((a, b) => {
    if (a.unmatched !== b.unmatched) return a.unmatched ? 1 : -1;
    return (a.matchedSurname || a.csvName).localeCompare(b.matchedSurname || b.csvName);
  });
}

interface ImportDialogProps {
  onImportComplete?: () => void;
}

export function ImportPayrollDialog({ onImportComplete }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [periodName, setPeriodName] = useState("February 2026");
  const [startDate, setStartDate] = useState("2026-01-19");
  const [endDate, setEndDate] = useState("2026-02-22");
  const [payDate, setPayDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [aggregated, setAggregated] = useState<AggregatedEmployee[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [existingPeriodId, setExistingPeriodId] = useState<string | null>(null);
  const [useExistingPeriod, setUseExistingPeriod] = useState(false);

  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();

  // Detect existing draft period matching dates
  useEffect(() => {
    const match = periods.find(
      (p) => p.status === "draft" && p.period_name === periodName
    );
    if (match) {
      setExistingPeriodId(match.id);
      setUseExistingPeriod(true);
    } else {
      setExistingPeriodId(null);
      setUseExistingPeriod(false);
    }
  }, [periods, periodName]);

  const handleFileChange = useCallback(async (f: File | null) => {
    setFile(f);
    if (!f) return;

    try {
      const text = await f.text();
      const rows = parseTimesheetCSV(text);
      const agg = aggregateByEmployee(rows, employees);
      setAggregated(agg);
      setStep("preview");
    } catch (err) {
      toast.error("Failed to parse CSV file");
      console.error(err);
    }
  }, [employees]);

  const unmatchedCount = aggregated.filter((e) => e.unmatched).length;
  const matchedEntries = aggregated.filter((e) => !e.unmatched);

  const handleImport = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate period weeks
      const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
      const periodWeeks = Math.round((days / 7) * 10) / 10;

      // Create payroll period with unmatched employee note OR use existing
      const unmatchedNames = aggregated.filter(e => e.unmatched).map(e => e.csvName);
      const periodNotes = unmatchedNames.length > 0
        ? `⚠ PENDING: ${unmatchedNames.length} unmatched employee(s) need adding: ${unmatchedNames.join(", ")}. Add them to the employee database and re-import or manually add to this period.`
        : null;

      let periodId: string;

      if (useExistingPeriod && existingPeriodId) {
        // Update existing period
        periodId = existingPeriodId;
        await supabase
          .from("payroll_periods")
          .update({
            notes: periodNotes,
            imported_by: user?.id,
          })
          .eq("id", periodId);

        // Delete existing entries to replace with fresh import
        await supabase
          .from("payroll_entries")
          .delete()
          .eq("payroll_period_id", periodId);
      } else {
        // Calculate period weeks
        const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
        const periodWeeks = Math.round((days / 7) * 10) / 10;

        const { data: period, error: periodError } = await supabase
          .from("payroll_periods")
          .insert({
            period_name: periodName,
            start_date: startDate,
            end_date: endDate,
            pay_date: payDate || null,
            period_weeks: periodWeeks,
            status: "draft" as const,
            imported_by: user?.id,
            notes: periodNotes,
          })
          .select()
          .single();

        if (periodError) throw periodError;
        periodId = period.id;
      }

      // Insert matched entries
      let entriesCreated = 0;
      for (const emp of matchedEntries) {
        if (!emp.matchedId || !emp.hourlyRate) continue;

        const hours = emp.totalHours;
        const rate = emp.hourlyRate;
        const sc = emp.serviceCharge || 0;
        const basePay = hours * rate;
        const servicePay = hours * sc;
        const totalPay = basePay + servicePay;
        const holidayAccrued = calculateHolidayAccrual(hours);

        // Location breakdown notes
        const locNotes = emp.locations.length > 1
          ? `Hours by location: ${emp.locations.map((l) => `${l.name}: ${l.hours.toFixed(2)}h`).join(" | ")}`
          : `Location: ${emp.locations[0]?.name}`;

        const { error: entryError } = await supabase
          .from("payroll_entries")
          .insert({
            payroll_period_id: periodId,
            employee_id: emp.matchedId,
            hourly_rate: rate,
            service_charge: sc,
            timesheet_hours: hours,
            performance_bonus: 0,
            special_bonus: 0,
            holiday_accrued_hours: holidayAccrued,
            total_pay: totalPay,
            notes: locNotes,
          });

        if (entryError) throw entryError;
        entriesCreated++;
      }

      // Update period totals
      const totalPay = matchedEntries.reduce((s, e) => {
        const h = e.totalHours;
        const r = e.hourlyRate || 0;
        const sc = e.serviceCharge || 0;
        return s + h * r + h * sc;
      }, 0);

      await supabase
        .from("payroll_periods")
        .update({
          timesheet_total: totalPay,
          grand_total: totalPay,
        })
        .eq("id", periodId);

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "import" as const,
        table_name: "payroll_periods",
        record_id: periodId,
        new_data: {
          operation: "csv_timesheet_import",
          period_name: periodName,
          entries_created: entriesCreated,
          unmatched_employees: unmatchedNames,
          source_file: file?.name || "unknown",
        },
      });

      // Create import record
      await supabase.from("payroll_imports").insert({
        payroll_period_id: periodId,
        file_name: file?.name || "CSV Import",
        imported_by: user?.id,
        import_status: "completed",
        records_imported: entriesCreated,
        errors: unmatchedNames.length > 0 ? { unmatched: unmatchedNames } : null,
      });

      setStep("done");
      setImportMessage(
        `Imported ${entriesCreated} employees.` +
        (unmatchedNames.length > 0 ? ` ${unmatchedNames.length} employee(s) still need adding to the database.` : "")
      );

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });

      toast.success("Payroll imported!");
      onImportComplete?.();

    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import payroll");
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPeriodName("February 2026");
    setStartDate("2026-01-19");
    setEndDate("2026-02-22");
    setPayDate("");
    setStep("upload");
    setAggregated([]);
    setImportMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <Upload className="mr-2 h-4 w-4" />
          Import Payroll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Timesheet CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Period Name *</Label>
              <Input value={periodName} onChange={(e) => setPeriodName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Timesheet CSV File *</Label>
              <Input type="file" accept=".csv" onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">
                Upload the Schedule vs Timesheet report CSV. Hours will be aggregated per employee across all locations.
              </p>
            </div>
            {existingPeriodId && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm flex items-start gap-2">
                <RefreshCw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary">Existing "{periodName}" draft period found</p>
                  <p className="text-muted-foreground mt-0.5">
                    Import will <strong>replace all existing entries</strong> in this period with fresh data from the CSV.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>{matchedEntries.length}</strong> matched · <strong>{aggregated.reduce((s, e) => s + e.totalHours, 0).toFixed(1)}</strong> total hours
              </p>
              {unmatchedCount > 0 && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <UserPlus className="h-3 w-3 mr-1" />
                  {unmatchedCount} unmatched
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
              <div className="divide-y divide-border">
                {aggregated.map((emp, idx) => (
                  <div key={idx} className={`px-4 py-2.5 flex items-center justify-between text-sm ${emp.unmatched ? "bg-warning/5" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {emp.unmatched ? (
                          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                            Not in DB
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{emp.department}</Badge>
                        )}
                        <span className="font-medium truncate">
                          {emp.unmatched ? emp.csvName : `${emp.matchedForename} ${emp.matchedSurname}`}
                        </span>
                        {!emp.unmatched && emp.csvName.toLowerCase() !== `${emp.matchedForename} ${emp.matchedSurname}`.toLowerCase() && (
                          <span className="text-xs text-muted-foreground">← "{emp.csvName}"</span>
                        )}
                      </div>
                      {emp.locations.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {emp.locations.map((l) => `${l.name}: ${l.hours.toFixed(1)}h`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="font-mono font-medium">{emp.totalHours.toFixed(2)} hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {unmatchedCount > 0 && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm">
                <p className="font-medium text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {unmatchedCount} employee(s) not found in database
                </p>
                <p className="text-muted-foreground mt-1">
                  They will be skipped during import. The payroll period will be flagged until you add them to the employee database and manually add them to this period. <strong>You cannot approve this payroll until all employees are accounted for.</strong>
                </p>
              </div>
            )}

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
              <p className="text-muted-foreground">
                {useExistingPeriod
                  ? <>Import will <strong>update the existing "{periodName}"</strong> draft period, replacing all entries with fresh CSV data.</>
                  : <>Import will create a new <strong>Draft</strong> period.</>
                }{" "}
                Rates and service charges are pulled from each employee's master record. Bonuses default to £0 — edit them in the payroll table after import.
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="text-lg font-medium">{importMessage}</p>
            {unmatchedCount > 0 && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-left">
                <p className="font-medium text-warning mb-1">Action Required</p>
                <p className="text-muted-foreground">
                  Add the following employees to your database, then add them to this payroll period:
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {aggregated.filter(e => e.unmatched).map((e, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {e.csvName} ({e.totalHours.toFixed(1)}h)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          {step === "preview" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
            {step === "done" ? "Close" : "Cancel"}
          </Button>
          {step === "preview" && (
            <Button onClick={handleImport} disabled={importing || matchedEntries.length === 0}>
              {importing ? "Importing..." : useExistingPeriod ? `Update ${matchedEntries.length} Entries` : `Import ${matchedEntries.length} Employees`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
