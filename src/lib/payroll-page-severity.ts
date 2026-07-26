import type { ApprovalChecklistResult, ChecklistItem } from "@/lib/payroll-approval-checklist";
import type { PayrollImportIssue } from "@/hooks/usePayrollImportStatus";

/**
 * Phase B — pure derivation of Payroll page severity groups.
 *
 * Read-only. Never mutates payroll or approval state. Simply projects the
 * existing signals (approval checklist, NMW summary, import issues) into
 * three presentational buckets:
 *   - blockers (Action Required)
 *   - warnings (Review & Acknowledge)
 *   - counts for the compact status bar
 */

export interface DerivedPanelItem {
  id: string;
  title: string;
  detail?: string;
  count?: number;
}

export interface PayrollPageSeverityInput {
  checklist: ApprovalChecklistResult | null;
  importBlockingIssueCount: number;
  nmwBlockerCount: number;
}

export interface PayrollPageSeverity {
  blockers: DerivedPanelItem[];
  warnings: DerivedPanelItem[];
  blockerCount: number;
  warningCount: number;
  ready: boolean;
}

export function derivePayrollPageSeverity({
  checklist,
  importBlockingIssueCount,
  nmwBlockerCount,
}: PayrollPageSeverityInput): PayrollPageSeverity {
  const blockers: DerivedPanelItem[] = [];
  const warnings: DerivedPanelItem[] = [];

  if (importBlockingIssueCount > 0) {
    blockers.push({
      id: "import_unresolved",
      title: "Unresolved timesheet import issues",
      detail:
        "Names in the imported timesheet could not be matched to active employees. Resolve or exclude each before submitting.",
      count: importBlockingIssueCount,
    });
  }

  if (checklist) {
    for (const item of checklist.items) {
      if (item.blocking) {
        // Skip import-related blockers that we've already surfaced explicitly.
        blockers.push({
          id: `checklist_${item.id}`,
          title: item.title,
          detail: item.detail,
          count: item.count,
        });
      } else if (item.status === "warning") {
        warnings.push({
          id: `checklist_${item.id}`,
          title: item.title,
          detail: item.detail,
          count: item.count,
        });
      }
    }
  }

  // NMW: if checklist already caught it as a blocker (nmw_non_compliant), we
  // do not want a duplicate — but if the checklist wasn't built yet (e.g. no
  // entries loaded), fall back to the standalone NMW signal.
  const alreadyHasNmwBlocker = blockers.some(
    (b) => b.id === "checklist_nmw_non_compliant",
  );
  if (nmwBlockerCount > 0 && !alreadyHasNmwBlocker) {
    blockers.push({
      id: "nmw_blocker",
      title: "Employees below UK minimum wage",
      detail:
        "Service charge cannot count towards NMW. Correct the base rate or add a top-up before approval.",
      count: nmwBlockerCount,
    });
  }

  const blockerCount = blockers.length;
  const warningCount = warnings.length;
  const ready = blockerCount === 0;

  return { blockers, warnings, blockerCount, warningCount, ready };
}

/** Helper — filter checklist items by group for callers that want raw items. */
export function partitionChecklistItems(items: ChecklistItem[]) {
  const blocking: ChecklistItem[] = [];
  const warning: ChecklistItem[] = [];
  const pass: ChecklistItem[] = [];
  for (const i of items) {
    if (i.blocking) blocking.push(i);
    else if (i.status === "warning") warning.push(i);
    else pass.push(i);
  }
  return { blocking, warning, pass };
}

// Re-export for convenience
export type { PayrollImportIssue };
