/**
 * Read-only access to the timesheet evidence stored for a payroll period.
 *
 * Loads the most recent completed payroll import for the period, downloads the
 * original CSV from storage and parses it. Nothing is written — this is purely
 * used to surface the hours already recorded for the period (e.g. when adding a
 * single employee to a draft so their imported hours appear immediately).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { parseTimesheetCSV, type ParsedRow } from "@/lib/payroll-timesheet-csv";
import { matchEmployeeRow, type MatchableEmployee, type MatchMethod, type SavedAlias } from "@/lib/payroll-matching";

export interface PeriodTimesheetSource {
  fileName: string | null;
  importedAt: string | null;
  rows: ParsedRow[];
}

export interface EmployeeTimesheetHours {
  hours: number;
  locations: { name: string; hours: number }[];
  matchMethod: MatchMethod;
  requiresReview: boolean;
  reviewReason?: string;
  fileName: string | null;
}

export function usePeriodTimesheetSource(periodId?: string | null) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["period_timesheet_source", tenantId, periodId],
    enabled: !!tenantId && !!periodId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PeriodTimesheetSource> => {
      const empty: PeriodTimesheetSource = { fileName: null, importedAt: null, rows: [] };

      const { data: imports, error } = await supabase
        .from("payroll_imports")
        .select("file_name, file_path, created_at, import_status")
        .eq("tenant_id", tenantId!)
        .eq("payroll_period_id", periodId!)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const latest = (imports || []).find((i: any) => !!i.file_path);
      if (!latest?.file_path) return empty;

      const { data: blob, error: dlError } = await supabase.storage
        .from("payroll-files")
        .download(latest.file_path);

      if (dlError || !blob) return { fileName: latest.file_name ?? null, importedAt: latest.created_at ?? null, rows: [] };

      const text = await blob.text();
      const { rows } = parseTimesheetCSV(text);
      return { fileName: latest.file_name ?? null, importedAt: latest.created_at ?? null, rows };
    },
  });
}

/**
 * Resolve the timesheet hours recorded in the period's source file for ONE
 * employee. Rows are matched with the same priority matcher used by the import
 * flow, and only rows that resolve to this exact employee are counted.
 */
export function resolveEmployeeTimesheetHours(
  source: PeriodTimesheetSource | undefined,
  employeeId: string,
  employees: MatchableEmployee[],
  savedAliases: SavedAlias[] = [],
): EmployeeTimesheetHours | null {
  if (!source || source.rows.length === 0 || !employeeId) return null;

  const locations: { name: string; hours: number }[] = [];
  let hours = 0;
  let matchMethod: MatchMethod = "none";
  let requiresReview = false;
  let reviewReason: string | undefined;

  for (const row of source.rows) {
    const res = matchEmployeeRow({ name: row.csvName }, employees, savedAliases);
    if (!res.employee || res.employee.id !== employeeId) continue;
    hours += row.hours;
    locations.push({ name: row.location, hours: row.hours });
    if (matchMethod === "none") matchMethod = res.method;
    if (res.requiresReview) {
      requiresReview = true;
      reviewReason = reviewReason || res.reviewReason;
    }
  }

  if (locations.length === 0) return null;

  return { hours, locations, matchMethod, requiresReview, reviewReason, fileName: source.fileName };
}
