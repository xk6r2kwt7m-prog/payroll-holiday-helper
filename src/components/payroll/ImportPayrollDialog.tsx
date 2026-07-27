import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle,
  UserPlus, RefreshCw, Link2, Ban, ChevronRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { calculateAccrual } from "@/hooks/useLeaveRules";
import { useTenant } from "@/hooks/useTenant";
import { matchEmployee, matchEmployeeRow, type MatchableEmployee, type MatchMethod, type SavedAlias } from "@/lib/payroll-matching";
import { findMissingFromFile, linkMissingToUnresolvedRows } from "@/lib/payroll-import-trace";
import { suggestNextPeriod } from "@/lib/payroll-period-suggestion";
import { usePayrollImportAliases } from "@/hooks/usePayrollImportAliases";
import { sanitisePayrollPeriodUpdate, normalisePayrollStatus } from "@/lib/payroll-status";
import { CreateEmployeeFromImport } from "./CreateEmployeeFromImport";

// ─── CSV section → location/department mappings ───
const SECTION_LOCATION_MAP: Record<string, string> = {
  "[BOH]BOH - Brixton": "Brixton (BOH)",
  "[FOH]FOH - Brixton": "Brixton (FOH)",
  "[RTD]KITCHEN": "CPU Kitchen",
  "[E98]FOH": "Fitzrovia (FOH)",
  "[YT5]30 Rathbone Place Ugly Dumpling WT 1JG,uk": "Fitzrovia (CPU)",
  "[KVQ]BOH": "Carnaby (BOH)",
  "[UGL]FOH": "Carnaby (FOH)",
};

const SECTION_DEPT_MAP: Record<string, string> = {
  "[BOH]BOH - Brixton": "BOH",
  "[FOH]FOH - Brixton": "FOH",
  "[RTD]KITCHEN": "BOH",
  "[E98]FOH": "FOH",
  "[YT5]30 Rathbone Place Ugly Dumpling WT 1JG,uk": "CPU",
  "[KVQ]BOH": "BOH",
  "[UGL]FOH": "FOH",
};

const SKIP_NAMES = new Set(["zak cope"]);

interface ParsedRow {
  csvName: string;
  hours: number;
  section: string;
  location: string;
}

export interface ParserSkippedSummary {
  /** Rows that appeared before any recognised section header. */
  beforeSection: number;
  /** Rows whose section header was recognised but format could not be parsed. */
  unknownFormat: number;
  /** Rows explicitly skipped by hard-coded SKIP_NAMES (e.g. platform admins). */
  skipNames: number;
  /** Section headers with no configured location/department mapping. */
  unmappedSections: string[];
}

export interface ParserResult {
  rows: ParsedRow[];
  skipped: ParserSkippedSummary;
}

export interface AggregatedEmployee {
  csvName: string;
  totalHours: number;
  locations: { name: string; hours: number }[];
  matchedId?: string;
  matchedForename?: string;
  matchedSurname?: string;
  matchMethod: MatchMethod;
  department?: string;
  hourlyRate?: number;
  serviceCharge?: number;
  unmatched: boolean;
  resolution?: "matched" | "created" | "excluded";
  excludeReason?: string;
  isLeaver?: boolean;
  isOnboarding?: boolean;
  requiresReview?: boolean;
  reviewReason?: string;
}

type Step = "period" | "upload" | "preview" | "done";

// ─── CSV Parser ───
function parseTimesheetCSV(csvText: string): ParserResult {
  const lines = csvText.split("\n");
  const rows: ParsedRow[] = [];
  const skipped: ParserSkippedSummary = {
    beforeSection: 0,
    unknownFormat: 0,
    skipNames: 0,
    unmappedSections: [],
  };
  const seenUnmapped = new Set<string>();
  let currentSection = "";

  // Detect Timesheet Hour column from header row
  const headerLine = lines[0]?.toLowerCase() || "";
  const headerCols = headerLine.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
  let timesheetColIndex = headerCols.findIndex(
    (c) => c.replace(/"/g, "").trim() === "timesheet hour"
  );
  // Fallback to index 2 if header not found (backward compat)
  if (timesheetColIndex < 0) timesheetColIndex = 2;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\s*"?\s*(\[.+?\].+?)"?\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!SECTION_LOCATION_MAP[currentSection] && !seenUnmapped.has(currentSection)) {
        seenUnmapped.add(currentSection);
        skipped.unmappedSections.push(currentSection);
      }
      continue;
    }

    if (line.toLowerCase().includes("total for") || line.toLowerCase().includes("grand total") || line.toLowerCase().includes("unpaid leave")) continue;

    const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g);
    if (!cols || cols.length < 3) {
      skipped.unknownFormat++;
      continue;
    }

    const name = cols[0]?.replace(/"/g, "").trim();
    const timesheetHoursStr = cols[timesheetColIndex]?.replace(/"/g, "").replace(/,/g, "").trim();

    if (!name) continue;
    if (name.toLowerCase().startsWith("total for")) continue;

    if (!currentSection) {
      skipped.beforeSection++;
      continue;
    }
    if (SKIP_NAMES.has(name.toLowerCase())) {
      skipped.skipNames++;
      continue;
    }

    const hours = parseFloat(timesheetHoursStr) || 0;
    if (hours === 0 && timesheetHoursStr === "-") continue;

    rows.push({
      csvName: name,
      hours,
      section: currentSection,
      location: SECTION_LOCATION_MAP[currentSection] || currentSection,
    });
  }
  return { rows, skipped };
}

function aggregateByEmployee(
  rows: ParsedRow[],
  employees: MatchableEmployee[],
  savedAliases: SavedAlias[] = [],
): AggregatedEmployee[] {
  const empMap = new Map<string, AggregatedEmployee>();

  for (const row of rows) {
    const nameLower = row.csvName.toLowerCase().trim();
    // SKIP_NAMES already filtered at parser stage; second guard for safety.
    if (SKIP_NAMES.has(nameLower)) continue;

    // Use the full priority matcher so saved aliases are honoured during
    // CSV parsing (previously only honoured post-import in the issues panel).
    const matchRes = matchEmployeeRow(
      { name: row.csvName },
      employees,
      savedAliases,
    );
    const { employee: matchedEmp, method, requiresReview, reviewReason } = matchRes;
    // Onboarding matches that require confirmation stay in the unresolved
    // pool — the manager must select/confirm before they import.
    const treatAsUnmatched = !matchedEmp || !!requiresReview;

    const matchKey = matchedEmp && !treatAsUnmatched
      ? `${matchedEmp.forename} ${matchedEmp.surname}`.toLowerCase()
      : nameLower;

    const existing = empMap.get(matchKey);
    if (existing) {
      existing.totalHours += row.hours;
      existing.locations.push({ name: row.location, hours: row.hours });
    } else {
      empMap.set(matchKey, {
        csvName: row.csvName,
        totalHours: row.hours,
        locations: [{ name: row.location, hours: row.hours }],
        matchedForename: treatAsUnmatched ? undefined : matchedEmp?.forename,
        matchedSurname: treatAsUnmatched ? undefined : matchedEmp?.surname,
        matchedId: treatAsUnmatched ? undefined : matchedEmp?.id,
        matchMethod: method,
        department: treatAsUnmatched ? undefined : matchedEmp?.department,
        hourlyRate: treatAsUnmatched ? undefined : matchedEmp?.hourly_rate,
        serviceCharge: treatAsUnmatched ? undefined : matchedEmp?.service_charge ?? 0,
        unmatched: treatAsUnmatched,
        resolution: treatAsUnmatched ? undefined : "matched",
        isLeaver: matchedEmp?.status === "leaver",
        isOnboarding: matchedEmp?.status === "onboarding",
        requiresReview: !!requiresReview,
        reviewReason,
      });
    }
  }

  return Array.from(empMap.values()).sort((a, b) => {
    if (a.unmatched !== b.unmatched) return a.unmatched ? 1 : -1;
    return (a.matchedSurname || a.csvName).localeCompare(b.matchedSurname || b.csvName);
  });
}

// ─── Main Component ───
interface ImportDialogProps {
  onImportComplete?: () => void;
  /** When the manager already has a draft period selected, pass it so the import targets that period */
  selectedPeriod?: { id: string; period_name: string; start_date: string; end_date: string; pay_date: string | null; status: string } | null;
}

export function ImportPayrollDialog({ onImportComplete, selectedPeriod: incomingPeriod }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payDate, setPayDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<Step>("period");
  const [aggregated, setAggregated] = useState<AggregatedEmployee[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [existingPeriodId, setExistingPeriodId] = useState<string | null>(null);
  const [useExistingPeriod, setUseExistingPeriod] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [existingBonusWarning, setExistingBonusWarning] = useState<string | null>(null);
  const [parserSkipped, setParserSkipped] = useState<ParserSkippedSummary | null>(null);
  const [bonusOverrideConfirmed, setBonusOverrideConfirmed] = useState(false);

  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees(true);
  const { data: periods = [] } = usePayrollPeriods();
  const { tenantId } = useTenant();
  const { activeAliases, saveAlias } = usePayrollImportAliases();

  // Default to selected draft period if available; otherwise auto-suggest next
  useEffect(() => {
    if (!open) return;

    // If a draft period is currently selected on the payroll page, use it
    if (incomingPeriod && incomingPeriod.status === "draft") {
      setPeriodName(incomingPeriod.period_name);
      setStartDate(incomingPeriod.start_date);
      setEndDate(incomingPeriod.end_date);
      setPayDate(incomingPeriod.pay_date || "");
      return;
    }

    // Fallback: auto-suggest the next period
    const latestEnd = periods.length > 0
      ? periods.reduce((latest, p) =>
          p.end_date > latest ? p.end_date : latest, periods[0].end_date)
      : null;
    const suggested = suggestNextPeriod(latestEnd);
    setPeriodName(suggested.periodName);
    setStartDate(suggested.startDate);
    setEndDate(suggested.endDate);
    setPayDate(suggested.payDate);
  }, [open, periods, incomingPeriod]);

  // Detect existing draft period and check for bonuses
  useEffect(() => {
    if (!periodName) return;
    const match = periods.find(
      (p) => p.status === "draft" && p.period_name === periodName
    );
    if (match) {
      setExistingPeriodId(match.id);
      setUseExistingPeriod(true);
      // Check for existing bonuses that would be overwritten
      (async () => {
        const { data: existingEntries } = await supabase
          .from("payroll_entries")
          .select("employee_id, performance_bonus, special_bonus, notes")
          .eq("payroll_period_id", match.id);
        if (existingEntries) {
          const withBonuses = existingEntries.filter(
            (e: any) => (Number(e.performance_bonus) > 0 || Number(e.special_bonus) > 0)
          );
          const withNotes = existingEntries.filter((e: any) => e.notes && e.notes.includes("manager_adjusted"));
          if (withBonuses.length > 0 || withNotes.length > 0) {
            const parts: string[] = [];
            if (withBonuses.length > 0) parts.push(`${withBonuses.length} employee(s) with bonuses`);
            if (withNotes.length > 0) parts.push(`${withNotes.length} manually adjusted entries`);
            setExistingBonusWarning(`This draft has ${parts.join(" and ")} that will be overwritten.`);
          } else {
            setExistingBonusWarning(null);
          }
        }
        setBonusOverrideConfirmed(false);
      })();
    } else {
      setExistingPeriodId(null);
      setUseExistingPeriod(false);
      setExistingBonusWarning(null);
      setBonusOverrideConfirmed(false);
    }
  }, [periods, periodName]);

  const matchableEmployees: MatchableEmployee[] = useMemo(() =>
    employees.map(e => ({
      id: e.id,
      forename: e.forename,
      surname: e.surname,
      department: e.department,
      hourly_rate: e.hourly_rate,
      service_charge: e.service_charge,
      status: e.status,
      email: e.email,
      preferred_name: (e as any).preferred_name ?? null,
      import_aliases: (e as any).import_aliases ?? [],
      start_date: (e as any).start_date ?? null,
      end_date: (e as any).end_date ?? null,
      branch_id: (e as any).branch_id ?? null,
      archived_at: (e as any).archived_at ?? null,
    })),
  [employees]);

  // Re-evaluate unmatched entries when employee list changes (e.g. starter created outside dialog)
  useEffect(() => {
    if (aggregated.length === 0) return;
    const hasUnresolved = aggregated.some(e => e.unmatched && !e.resolution);
    if (!hasUnresolved) return;

    setAggregated(prev => prev.map(emp => {
      if (!emp.unmatched || emp.resolution) return emp;
      const { employee: matched, method } = matchEmployeeRow({ name: emp.csvName }, matchableEmployees, activeAliases);
      if (!matched) return emp;
      return {
        ...emp,
        matchedId: matched.id,
        matchedForename: matched.forename,
        matchedSurname: matched.surname,
        department: matched.department,
        hourlyRate: matched.hourly_rate,
        serviceCharge: matched.service_charge ?? 0,
        unmatched: false,
        resolution: "matched" as const,
        matchMethod: method,
        isLeaver: matched.status === "leaver",
      };
    }));
  }, [matchableEmployees, activeAliases]);

  const handleFileChange = useCallback(async (f: File | null) => {
    setFile(f);
    setValidationErrors([]);
    if (!f) return;

    try {
      const text = await f.text();
      const { rows, skipped } = parseTimesheetCSV(text);
      setParserSkipped(skipped);
      const agg = aggregateByEmployee(rows, matchableEmployees, activeAliases);

      const errors: string[] = [];
      for (const emp of agg) {
        if (emp.totalHours < 0) errors.push(`${emp.csvName}: negative hours (${emp.totalHours})`);
        if (isNaN(emp.totalHours)) errors.push(`${emp.csvName}: hours is not a valid number`);
      }
      const matchedIds = agg.filter(e => e.matchedId).map(e => e.matchedId);
      const duplicateIds = matchedIds.filter((id, i) => matchedIds.indexOf(id) !== i);
      if (duplicateIds.length > 0) {
        const dupNames = agg.filter(e => duplicateIds.includes(e.matchedId))
          .map(e => `${e.matchedForename} ${e.matchedSurname}`);
        errors.push(`Duplicate employee match: ${[...new Set(dupNames)].join(", ")}`);
      }

      setValidationErrors(errors);
      setAggregated(agg);
      setStep("preview");
    } catch (err) {
      toast.error("Failed to parse CSV file");
      console.error(err);
    }
  }, [matchableEmployees]);

  // Manual match handler
  const handleManualMatch = async (csvName: string, employeeId: string) => {
    if (employeeId === "__none__") {
      setAggregated(prev => prev.map(emp =>
        emp.csvName === csvName
          ? { ...emp, matchedId: undefined, matchedForename: undefined, matchedSurname: undefined, hourlyRate: undefined, serviceCharge: undefined, department: undefined, unmatched: true, resolution: undefined, matchMethod: "none" as const }
          : emp
      ));
      return;
    }

    const matchedEmp = employees.find(e => e.id === employeeId);
    if (!matchedEmp) return;

    // Persist alias for future imports if the CSV name differs from the employee's full name.
    // Writes to BOTH the employee-level `import_aliases` array (legacy, used by the
    // legacy matcher) AND the new `payroll_import_aliases` table (used by
    // matchEmployeeRow). Never mutates the employee's forename/surname.
    const fullName = `${matchedEmp.forename} ${matchedEmp.surname}`.toLowerCase();
    const csvNameLower = csvName.trim().toLowerCase();
    if (csvNameLower !== fullName) {
      try {
        const existingAliases: string[] = (matchedEmp as any).import_aliases || [];
        if (!existingAliases.some(a => a.toLowerCase() === csvNameLower)) {
          const updatedAliases = [...existingAliases, csvName.trim()];
          await supabase
            .from("employees")
            .update({ import_aliases: updatedAliases } as any)
            .eq("id", matchedEmp.id);
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      } catch (err) {
        console.error("Failed to persist import alias on employee:", err);
        // Non-blocking: match still proceeds even if alias save fails
      }
      try {
        await saveAlias({ rawName: csvName.trim(), employeeId: matchedEmp.id });
      } catch (err) {
        console.error("Failed to persist payroll_import_aliases entry:", err);
        // Non-blocking
      }
    }

    setAggregated(prev => prev.map(emp =>
      emp.csvName === csvName
        ? {
            ...emp,
            matchedId: matchedEmp.id,
            matchedForename: matchedEmp.forename,
            matchedSurname: matchedEmp.surname,
            department: matchedEmp.department,
            hourlyRate: matchedEmp.hourly_rate,
            serviceCharge: matchedEmp.service_charge ?? 0,
            unmatched: false,
            resolution: "matched",
            matchMethod: "none" as const,
          }
        : emp
    ));
  };

  // Exclude handler
  const handleExclude = (csvName: string) => {
    setAggregated(prev => prev.map(emp =>
      emp.csvName === csvName
        ? { ...emp, resolution: "excluded", excludeReason: "Manager excluded from this payroll run" }
        : emp
    ));
  };

  const handleUndoExclude = (csvName: string) => {
    setAggregated(prev => prev.map(emp =>
      emp.csvName === csvName
        ? { ...emp, resolution: undefined, excludeReason: undefined }
        : emp
    ));
  };

  // Create employee callback
  const handleEmployeeCreated = (csvName: string, newEmp: { id: string; forename: string; surname: string; department: string; hourly_rate: number; service_charge: number | null }) => {
    setCreatingFor(null);
    setAggregated(prev => prev.map(emp =>
      emp.csvName === csvName
        ? {
            ...emp,
            matchedId: newEmp.id,
            matchedForename: newEmp.forename,
            matchedSurname: newEmp.surname,
            department: newEmp.department,
            hourlyRate: newEmp.hourly_rate,
            serviceCharge: newEmp.service_charge ?? 0,
            unmatched: false,
            resolution: "created",
            matchMethod: "none" as const,
          }
        : emp
    ));
  };

  const unresolvedCount = aggregated.filter(e => e.unmatched && e.resolution !== "excluded").length;
  const excludedCount = aggregated.filter(e => e.resolution === "excluded").length;
  const leaverCount = aggregated.filter(e => e.isLeaver && e.resolution !== "excluded").length;
  const importableEntries = aggregated.filter(e => !e.unmatched || e.resolution === "excluded");
  const matchedEntries = aggregated.filter(e => !e.unmatched);
  const totalHours = aggregated.reduce((s, e) => s + e.totalHours, 0);
  const canApproveAfterImport = unresolvedCount === 0;

  // Missing-from-file: active/starter employees NOT matched to any CSV row.
  // Shown as a warning before final import so the manager can confirm the
  // 0.00 hours is intentional (and not a silent name-match failure).
  const missingFromFile = useMemo(() => {
    if (aggregated.length === 0) return [];
    const matchedIds = aggregated
      .filter((e) => e.matchedId && e.resolution !== "excluded")
      .map((e) => e.matchedId as string);
    const periodCtx = startDate && endDate ? { start_date: startDate, end_date: endDate } : null;
    return findMissingFromFile(matchableEmployees, matchedIds, [], periodCtx);
  }, [aggregated, matchableEmployees, startDate, endDate]);
  const zeroHourMatched = aggregated.filter(
    (e) => !e.unmatched && e.resolution !== "excluded" && e.totalHours === 0,
  );

  const handleImport = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!tenantId) {
      toast.error("No workspace selected");
      return;
    }
    if (validationErrors.length > 0) {
      toast.error("Fix validation errors before importing");
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Collect location split rows to bulk-insert after entries
      const locationRows: { payroll_entry_id: string; employee_id: string; location_name: string; department: string | null; hours: number }[] = [];
      const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
      const periodWeeks = Math.round((days / 7) * 10) / 10;

      const unmatchedNames = aggregated.filter(e => e.unmatched && e.resolution !== "excluded").map(e => e.csvName);
      const excludedNames = aggregated.filter(e => e.resolution === "excluded").map(e => e.csvName);
      const leaverNames = aggregated.filter(e => e.isLeaver && e.resolution !== "excluded").map(e => `${e.matchedForename} ${e.matchedSurname}`);

      let periodNotes: string | null = null;
      if (unmatchedNames.length > 0) {
        periodNotes = `⚠ PENDING: ${unmatchedNames.length} unmatched employee(s): ${unmatchedNames.join(", ")}. Resolve before approval.`;
      }
      if (leaverNames.length > 0) {
        const lNote = `⚠ ${leaverNames.length} leaver(s) in imported timesheet: ${leaverNames.join(", ")}. Review before approval.`;
        periodNotes = periodNotes ? `${periodNotes}\n${lNote}` : lNote;
      }
      if (excludedNames.length > 0) {
        const exNote = `ℹ ${excludedNames.length} excluded from this run: ${excludedNames.join(", ")}.`;
        periodNotes = periodNotes ? `${periodNotes}\n${exNote}` : exNote;
      }

      let periodId: string;
      let entriesCreated = 0;

      // Phase 2C — resolve active employment terms once per import for any
      // NEW payroll entries we create (existing entries are never overwritten
      // here). Existing entries keep their previously-imported rate.
      const { fetchActiveTermsMap, resolveRateSource } = await import(
        "@/lib/payroll-rate-source"
      );
      const periodStartForTerms =
        (useExistingPeriod && incomingPeriod?.start_date) ||
        startDate ||
        new Date().toISOString().slice(0, 10);
      const importTermsMap = await fetchActiveTermsMap(
        tenantId!,
        matchedEntries.map(e => e.matchedId).filter(Boolean) as string[],
        periodStartForTerms,
      );


      if (useExistingPeriod && existingPeriodId) {
        periodId = existingPeriodId;
        await supabase
          .from("payroll_periods")
          .update(
            sanitisePayrollPeriodUpdate({
              notes: periodNotes,
              imported_by: user?.id,
              // Never touch status when importing into an existing period.
            }) as any,
          )
          .eq("id", periodId);

        // Fetch existing entries to preserve bonuses/rates from copy
        const { data: existingEntries } = await supabase
          .from("payroll_entries")
          .select("id, employee_id, hourly_rate, service_charge, performance_bonus, special_bonus")
          .eq("payroll_period_id", periodId);

        const existingByEmployeeId = new Map(
          (existingEntries || []).map((e: any) => [e.employee_id, e])
        );

        for (const emp of matchedEntries) {
          if (!emp.matchedId) continue;

          const hours = emp.totalHours;
          const holidayAccrued = calculateAccrual(hours, 0.1207);

          const locNotes = emp.locations.length > 1
            ? `Hours by location: ${emp.locations.map(l => `${l.name}: ${l.hours.toFixed(2)}h`).join(" | ")}`
            : `Location: ${emp.locations[0]?.name}`;

          const matchNote = emp.resolution === "created"
            ? " [Employee created during import]"
            : emp.matchMethod !== "exact" && emp.matchMethod !== "none"
            ? ` [Matched via ${emp.matchMethod.replace(/_/g, " ")}]`
            : "";

          const existing = existingByEmployeeId.get(emp.matchedId);

          if (existing) {
            // UPDATE hours only — preserve rate, service charge, bonuses from copy
            const rate = existing.hourly_rate;
            const sc = existing.service_charge || 0;
            const perfBonus = existing.performance_bonus || 0;
            const specBonus = existing.special_bonus || 0;
            const totalPay = (hours * rate) + (hours * sc) + perfBonus + specBonus;

            const { error: updateError } = await supabase
              .from("payroll_entries")
              .update({
                timesheet_hours: hours,
                imported_hours: hours,
                holiday_accrued_hours: holidayAccrued,
                total_pay: totalPay,
                notes: `${locNotes}${matchNote}`,
              } as any)
              .eq("id", existing.id);

            if (updateError) throw updateError;
            entriesCreated++;
            // Collect location splits for this entry
            for (const loc of emp.locations) {
              const locDept = SECTION_DEPT_MAP[Object.keys(SECTION_LOCATION_MAP).find(k => SECTION_LOCATION_MAP[k] === loc.name) || ""] || emp.department || null;
              locationRows.push({ payroll_entry_id: existing.id, employee_id: emp.matchedId!, location_name: loc.name, department: locDept, hours: loc.hours });
            }
            existingByEmployeeId.delete(emp.matchedId);
          } else {
            // Employee in CSV but not in copied period — create new entry.
            // Phase 2C: prefer active employment terms; fall back to CSV-matched profile rate.
            const _defaults = resolveRateSource(importTermsMap.get(emp.matchedId!), {
              id: emp.matchedId!,
              hourly_rate: emp.hourlyRate,
              service_charge: emp.serviceCharge,
              department: emp.department,
            });
            const rate = _defaults.hourly_rate || 0;
            const sc = _defaults.service_charge || 0;


            const { data: newEntry, error: insertError } = await supabase
              .from("payroll_entries")
              .insert({
                payroll_period_id: periodId,
                employee_id: emp.matchedId,
                hourly_rate: rate,
                service_charge: sc,
                timesheet_hours: hours,
                imported_hours: hours,
                performance_bonus: 0,
                special_bonus: 0,
                holiday_accrued_hours: holidayAccrued,
                total_pay: (hours * rate) + (hours * sc),
                notes: `${locNotes}${matchNote} [Added by import]`,
                tenant_id: tenantId,
              } as any)
              .select("id")
              .single();

            if (insertError) throw insertError;
            entriesCreated++;
            // Collect location splits for new entry
            if (newEntry) {
              for (const loc of emp.locations) {
                const locDept = SECTION_DEPT_MAP[Object.keys(SECTION_LOCATION_MAP).find(k => SECTION_LOCATION_MAP[k] === loc.name) || ""] || emp.department || null;
                locationRows.push({ payroll_entry_id: newEntry.id, employee_id: emp.matchedId!, location_name: loc.name, department: locDept, hours: loc.hours });
              }
            }
          }
        }
        // Entries from copy that had no CSV match remain untouched with 0 hours
      } else {
        const { data: period, error: periodError } = await supabase
          .from("payroll_periods")
          .insert(
            sanitisePayrollPeriodUpdate({
              period_name: periodName,
              start_date: startDate,
              end_date: endDate,
              pay_date: payDate || null,
              period_weeks: periodWeeks,
              status: normalisePayrollStatus("draft", "draft"),
              imported_by: user?.id,
              notes: periodNotes,
              tenant_id: tenantId,
            }) as any,
          )
          .select()
          .single();

        if (periodError) throw periodError;
        periodId = period.id;

        // New period from CSV only — create all entries fresh
        for (const emp of matchedEntries) {
          if (!emp.matchedId || !emp.hourlyRate) continue;

          const hours = emp.totalHours;
          // Phase 2C — prefer active employment terms; fall back to CSV-matched profile rate.
          const _defaults = resolveRateSource(importTermsMap.get(emp.matchedId!), {
            id: emp.matchedId!,
            hourly_rate: emp.hourlyRate,
            service_charge: emp.serviceCharge,
            department: emp.department,
          });
          const rate = _defaults.hourly_rate;
          const sc = _defaults.service_charge;
          const holidayAccrued = calculateAccrual(hours, 0.1207);

          const locNotes = emp.locations.length > 1
            ? `Hours by location: ${emp.locations.map(l => `${l.name}: ${l.hours.toFixed(2)}h`).join(" | ")}`
            : `Location: ${emp.locations[0]?.name}`;

          const matchNote = emp.resolution === "created"
            ? " [Employee created during import]"
            : emp.matchMethod !== "exact" && emp.matchMethod !== "none"
            ? ` [Matched via ${emp.matchMethod.replace(/_/g, " ")}]`
            : "";

          const { data: newEntry, error: entryError } = await supabase
            .from("payroll_entries")
            .insert({
              payroll_period_id: periodId,
              employee_id: emp.matchedId,
              hourly_rate: rate,
              service_charge: sc,
              timesheet_hours: hours,
              imported_hours: hours,
              performance_bonus: 0,
              special_bonus: 0,
              holiday_accrued_hours: holidayAccrued,
              total_pay: (hours * rate) + (hours * sc),
              notes: `${locNotes}${matchNote}`,
              tenant_id: tenantId,
            } as any)
            .select("id")
            .single();

          if (entryError) throw entryError;
          entriesCreated++;
          // Collect location splits for new entry
          if (newEntry) {
            for (const loc of emp.locations) {
              const locDept = SECTION_DEPT_MAP[Object.keys(SECTION_LOCATION_MAP).find(k => SECTION_LOCATION_MAP[k] === loc.name) || ""] || emp.department || null;
              locationRows.push({ payroll_entry_id: newEntry.id, employee_id: emp.matchedId!, location_name: loc.name, department: locDept, hours: loc.hours });
            }
          }
        }
      }

      // Bulk-insert structured location breakdown
      if (locationRows.length > 0) {
        // Delete existing location data for this period first (fresh import replaces)
        await supabase
          .from("payroll_entry_locations")
          .delete()
          .eq("payroll_period_id", periodId)
          .eq("tenant_id", tenantId);

        // Insert in batches of 100
        for (let i = 0; i < locationRows.length; i += 100) {
          const batch = locationRows.slice(i, i + 100).map(r => ({
            ...r,
            payroll_period_id: periodId,
            imported_source: "csv_import",
            tenant_id: tenantId,
          }));
          const { error: locError } = await supabase
            .from("payroll_entry_locations")
            .insert(batch);
          if (locError) console.error("Location data insert error:", locError);
        }
      }

      // Store original CSV file
      let storedFilePath: string | null = null;
      if (file) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${tenantId}/${periodId}/${timestamp}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("payroll-files")
          .upload(filePath, file, { contentType: "text/csv", upsert: false });
        if (!uploadError) storedFilePath = filePath;
      }

      // Audit log
      await supabase.from("audit_log").insert([{
        user_id: user?.id || null,
        action: "import" as const,
        table_name: "payroll_periods",
        record_id: periodId,
        tenant_id: tenantId,
        new_data: {
          operation: "csv_timesheet_import",
          period_name: periodName,
          entries_created: entriesCreated,
          unmatched_employees: unmatchedNames,
          excluded_employees: excludedNames,
          source_file: file?.name || "unknown",
          source_type: "manual_upload",
          stored_file_path: storedFilePath,
          match_methods: Object.fromEntries(
            matchedEntries.map(e => [e.csvName, e.matchMethod])
          ),
        },
      }]);

      // Import record
      await supabase.from("payroll_imports").insert({
        payroll_period_id: periodId,
        file_name: file?.name || "CSV Import",
        file_path: storedFilePath,
        imported_by: user?.id,
        import_status: "completed",
        records_imported: entriesCreated,
        tenant_id: tenantId,
        errors: unmatchedNames.length > 0 || excludedNames.length > 0 || leaverNames.length > 0
          ? { unmatched: unmatchedNames, excluded: excludedNames, leavers: leaverNames }
          : null,
      } as any);

      setStep("done");
      setImportMessage(
        `Imported ${entriesCreated} employee${entriesCreated !== 1 ? "s" : ""} into "${periodName}".` +
        (excludedNames.length > 0 ? ` ${excludedNames.length} excluded.` : "") +
        (unmatchedNames.length > 0 ? ` ${unmatchedNames.length} still unmatched — resolve before approval.` : "")
      );

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entry_locations"] });
      if (unmatchedNames.length > 0) {
        toast.success(
          `${entriesCreated} matched entries imported. ${unmatchedNames.length} unresolved row${unmatchedNames.length !== 1 ? "s" : ""} still require review before approval.`
        );
      } else {
        toast.success(`${entriesCreated} matched entries imported into "${periodName}".`);
      }
      onImportComplete?.();
    } catch (error: any) {
      console.error("Import error:", error);
      // Surface the real reason instead of a generic message.
      const raw =
        error?.message ||
        error?.error_description ||
        error?.hint ||
        error?.details ||
        (typeof error === "string" ? error : "");
      const code = error?.code ? ` [${error.code}]` : "";
      let friendly = raw || "Unknown error";
      if (/permission|rls|not allowed|denied/i.test(raw)) {
        friendly = `Permission denied — you may not have rights to update this period. ${raw}`;
      } else if (/duplicate key|unique/i.test(raw)) {
        friendly = `Duplicate employee mapping detected. ${raw}`;
      } else if (/approved|locked/i.test(raw)) {
        friendly = `This payroll period is approved and locked. ${raw}`;
      } else if (/violates check|invalid input|numeric/i.test(raw)) {
        friendly = `Invalid value rejected by database. ${raw}`;
      }
      toast.error(`Import failed${code}: ${friendly}`);
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setPayDate("");
    setStep("period");
    setAggregated([]);
    setImportMessage("");
    setValidationErrors([]);
    setCreatingFor(null);
    setExistingBonusWarning(null);
    setBonusOverrideConfirmed(false);
  };

  const matchMethodLabel = (m: MatchMethod) => {
    switch (m) {
      case "exact": return null;
      case "case_insensitive": return "name";
      case "email": return "email";
      case "import_alias": return "alias";
      case "preferred_name": return "nickname";
      case "legacy_name_map": return "mapped";
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary h-9 text-xs sm:text-sm">
          <Upload className="h-4 w-4 sm:mr-1.5 shrink-0" />
          <span className="hidden xs:inline">Import Timesheet</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {step === "period" && "Set Payroll Period"}
            {step === "upload" && "Upload Timesheet"}
            {step === "preview" && "Review & Resolve Matches"}
            {step === "done" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Period Setup ── */}
        {step === "period" && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {incomingPeriod && incomingPeriod.status === "draft" ? (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
                <p className="text-sm font-medium text-primary">
                  Importing into existing draft: {periodName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This import will update timesheet hours for the selected payroll period. Rates, bonuses, and service charge will be preserved.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-sm text-muted-foreground">
                  Auto-suggested based on your latest payroll period. Cutoff = last Sunday on or before pay date. Pay date = last Thursday.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Period Name *</Label>
              <Input value={periodName} onChange={(e) => setPeriodName(e.target.value)} placeholder="e.g. March 2026" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date (Cutoff) *</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Last Sunday on or before pay date</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>

            {existingPeriodId && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm flex items-start gap-2">
                <RefreshCw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary">Existing draft "{periodName}" found</p>
                  <p className="text-muted-foreground mt-0.5">
                    Import will <strong>update timesheet hours only</strong>. Rates, bonuses, and service charge from the copied period will be preserved.
                  </p>
                </div>
              </div>
            )}

            {existingBonusWarning && existingPeriodId && (
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Existing data preserved</p>
                    <p className="text-muted-foreground mt-0.5">{existingBonusWarning} These will be kept — only timesheet hours will be updated.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: File Upload ── */}
        {step === "upload" && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-sm text-muted-foreground">
                Importing into <strong>{periodName}</strong> ({startDate} → {endDate})
              </p>
            </div>

            <div className="space-y-2">
              <Label>Timesheet CSV File *</Label>
              <Input type="file" accept=".csv" onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">
                Upload the Deputy Schedule vs Timesheet report CSV.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview & Resolve ── */}
        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 py-2">
            {/* Summary bar */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Upload className="h-3 w-3" />
              <span>Source: <strong>Manual timesheet upload</strong> · {file?.name}</span>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
                <p className="font-medium text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {validationErrors.length} validation error(s)
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-destructive">
                  {validationErrors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <strong>{matchedEntries.length}</strong> matched · <strong>{totalHours.toFixed(1)}</strong> total hrs
              </span>
              <div className="flex gap-2">
                {unresolvedCount > 0 && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {unresolvedCount} unresolved
                  </Badge>
                )}
                {excludedCount > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Ban className="h-3 w-3 mr-1" />
                    {excludedCount} excluded
                  </Badge>
                )}
                {leaverCount > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {leaverCount} leaver{leaverCount !== 1 ? "s" : ""} in CSV
                  </Badge>
                )}
              </div>
            </div>

            {leaverCount > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
                <p className="font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Leaver appears in imported timesheet — review required
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {aggregated.filter(e => e.isLeaver && e.resolution !== "excluded").map(e => `${e.matchedForename} ${e.matchedSurname}`).join(", ")} — these employees have leaver status. Review before approving payroll.
                </p>
              </div>
            )}

            {missingFromFile.length > 0 && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm">
                <p className="font-medium text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {missingFromFile.length} expected employee{missingFromFile.length !== 1 ? "s" : ""} missing from uploaded file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Review warning only — does not block import.</strong> These employees are expected in this payroll period (based on employment dates and current-period activity) but no row in the uploaded timesheet matched them. If they should have worked, the file may use a different name — scroll to any unmatched row below and use "Match to employee" to link it (optionally saving the alias for future imports). Otherwise they will simply have 0.00h for this period.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {missingFromFile.slice(0, 20).map((m) => {
                    const reasonLabel =
                      m.reason === "current_starter" ? "Starter this period" :
                      m.reason === "current_leaver" ? "Leaver (final pay)" :
                      m.reason === "current_activity" ? "Current-period activity" :
                      "Active in period";
                    return (
                      <Badge key={m.employeeId} variant="outline" className="text-[10px]">
                        {m.fullName}{m.department ? ` • ${m.department}` : ""} • {reasonLabel}
                      </Badge>
                    );
                  })}
                  {missingFromFile.length > 20 && (
                    <Badge variant="outline" className="text-[10px]">+{missingFromFile.length - 20} more</Badge>
                  )}
                </div>
              </div>
            )}

            {zeroHourMatched.length > 0 && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  {zeroHourMatched.length} matched row{zeroHourMatched.length !== 1 ? "s" : ""} with 0.00 hours
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Shown for transparency. These will import as 0.00h unless excluded.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {zeroHourMatched.slice(0, 20).map((e) => (
                    <Badge key={e.csvName} variant="outline" className="text-[10px]">
                      {e.matchedForename} {e.matchedSurname}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 max-h-[380px] border rounded-lg">
              <div className="divide-y divide-border">

                {aggregated.map((emp, idx) => (
                  <div key={idx} className={`px-4 py-2.5 text-sm ${
                    emp.resolution === "excluded" ? "bg-muted/30 opacity-60" :
                    emp.unmatched ? "bg-warning/5" : ""
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {emp.resolution === "excluded" ? (
                          <Badge variant="outline" className="text-[10px] shrink-0">Excluded</Badge>
                        ) : emp.unmatched ? (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 shrink-0">
                            Unmatched
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{emp.department}</Badge>
                        )}
                        <span className="font-medium truncate">
                          {emp.unmatched && emp.resolution !== "excluded"
                            ? emp.csvName
                            : `${emp.matchedForename} ${emp.matchedSurname}`}
                        </span>
                        {!emp.unmatched && emp.csvName.toLowerCase() !== `${emp.matchedForename} ${emp.matchedSurname}`.toLowerCase() && (
                          <span className="text-[11px] text-muted-foreground">← "{emp.csvName}"</span>
                        )}
                        {!emp.unmatched && matchMethodLabel(emp.matchMethod) && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{matchMethodLabel(emp.matchMethod)}</Badge>
                        )}
                        {emp.resolution === "created" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-accent/10 text-accent-foreground border-accent/30">new</Badge>
                        )}
                        {emp.isLeaver && emp.resolution !== "excluded" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-destructive/10 text-destructive border-destructive/20">leaver</Badge>
                        )}
                      </div>
                      <span className="font-mono text-xs ml-3 shrink-0">{emp.totalHours.toFixed(2)}h</span>
                    </div>

                    {/* Unmatched resolution controls */}
                    {emp.unmatched && emp.resolution !== "excluded" && (
                      <div className="mt-2 space-y-2">
                        {creatingFor === emp.csvName ? (
                          <CreateEmployeeFromImport
                            csvName={emp.csvName}
                            onCreated={(newEmp) => handleEmployeeCreated(emp.csvName, newEmp)}
                            onCancel={() => setCreatingFor(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Select
                                value="__none__"
                                onValueChange={(val) => handleManualMatch(emp.csvName, val)}
                              >
                                <SelectTrigger className="h-7 text-xs w-[200px]">
                                  <SelectValue placeholder="Match to employee…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— Select employee —</SelectItem>
                                  {employees
                                    .sort((a, b) => a.forename.localeCompare(b.forename))
                                    .map(e => (
                                      <SelectItem key={e.id} value={e.id}>
                                        {e.forename} {e.surname} ({e.department}){e.status === "starter" ? " • Starter" : e.status === "leaver" ? " • Leaver" : ""}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setCreatingFor(emp.csvName)}
                            >
                              <UserPlus className="h-3 w-3" />
                              Create
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-muted-foreground"
                              onClick={() => handleExclude(emp.csvName)}
                            >
                              <Ban className="h-3 w-3" />
                              Exclude
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {emp.resolution === "excluded" && (
                      <div className="mt-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground" onClick={() => handleUndoExclude(emp.csvName)}>
                          Undo exclude
                        </Button>
                      </div>
                    )}

                    {emp.locations.length > 1 && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        {emp.locations.map(l => `${l.name}: ${l.hours.toFixed(1)}h`).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Warnings */}
            {unresolvedCount > 0 && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm" data-testid="unresolved-rows-panel">
                <p className="font-medium text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {unresolvedCount} unresolved row{unresolvedCount !== 1 ? "s" : ""} in uploaded file
                </p>
                <p className="text-muted-foreground mt-1">
                  These are <strong>names in the uploaded timesheet</strong> that could not be safely matched to an employee. Matched rows ({matchedEntries.length}) will still be imported now — <strong>approval will be blocked</strong> until every unresolved row is matched, created, or excluded. Unresolved rows are preserved on the payroll period and can be resolved from the "Action Required" panel after import.
                </p>
              </div>
            )}

            {unresolvedCount === 0 && aggregated.length > 0 && (
              <div className="rounded-lg bg-accent/10 border border-accent/30 p-3 text-sm">
                <p className="font-medium text-accent-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  All employees resolved — ready to import
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle className={`h-12 w-12 mx-auto ${unresolvedCount > 0 ? "text-warning" : "text-primary"}`} />
            <p className="text-base font-medium">
              Imported {matchedEntries.length} employee{matchedEntries.length !== 1 ? "s" : ""} into "{periodName}".
              {excludedCount > 0 ? ` ${excludedCount} excluded.` : ""}
            </p>
            {unresolvedCount > 0 && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-left">
                <p className="font-medium text-warning mb-1">⚠ Action required before approval</p>
                <p className="text-muted-foreground">
                  {unresolvedCount} employee{unresolvedCount !== 1 ? "s" : ""} still unmatched. Resolve in the payroll period before submitting for approval.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {aggregated.filter(e => e.unmatched && e.resolution !== "excluded").map((e, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {e.csvName} ({e.totalHours.toFixed(1)}h)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {unresolvedCount === 0 && (
              <p className="text-sm text-muted-foreground">All employees matched. Ready for review.</p>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {step === "upload" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("period")} className="gap-1 text-xs">
                <ArrowLeft className="h-3 w-3" /> Period
              </Button>
            )}
            {step === "preview" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="gap-1 text-xs">
                <ArrowLeft className="h-3 w-3" /> File
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); resetForm(); }}>
              {step === "done" ? "Close" : "Cancel"}
            </Button>
            {step === "period" && (
              <Button
                size="sm"
                onClick={() => setStep("upload")}
                disabled={!periodName || !startDate || !endDate}
                className="gap-1"
              >
                Continue <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === "preview" && (
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || matchedEntries.length === 0 || validationErrors.length > 0}
              >
                {importing
                  ? "Importing…"
                  : useExistingPeriod
                  ? `Update ${matchedEntries.length} Entries`
                  : `Import ${matchedEntries.length} Employee${matchedEntries.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
