/**
 * Workflow contract regression test for the live "pay holiday in the
 * system" flow. Asserts the source-of-truth sequence in
 * `src/hooks/useHolidays.ts` and `supabase/functions/import-historical-payroll`.
 *
 * Because Vitest can't run a transactional fixture against the live
 * Postgres in this sandbox, the contract is locked by *source inspection*
 * — the same pattern used by `phase-holiday-orphan-ledger-reversal.test.ts`.
 * Together with `phase-holiday-carry-over-double-count.test.ts`, these
 * tests freeze the invariants the read-only investigation verified
 * end-to-end against the live DB.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const useHolidaysSrc = readFileSync(
  resolve(__dirname, "../hooks/useHolidays.ts"),
  "utf8",
);
const importFnSrc = readFileSync(
  resolve(
    __dirname,
    "../../supabase/functions/import-historical-payroll/index.ts",
  ),
  "utf8",
);

describe("useCreateHolidayPayment — live workflow contract", () => {
  it("inserts a holiday_payments row and a matching ledger row", () => {
    expect(useHolidaysSrc).toMatch(/\.from\(["']holiday_payments["']\)\s*\.insert/);
    expect(useHolidaysSrc).toMatch(/\.from\(["']holiday_ledger["']\)\s*\.insert/);
  });

  it("ledger row uses negative hours and the matching payment id", () => {
    expect(useHolidaysSrc).toMatch(/hoursValue\s*=\s*-Math\.abs\(Number\(payment\.hours\)\)/);
    expect(useHolidaysSrc).toMatch(/source_table:\s*["']holiday_payments["']/);
    expect(useHolidaysSrc).toMatch(/source_id:\s*data\.id/);
    expect(useHolidaysSrc).toMatch(/entry_type:\s*["']holiday_taken["']/);
  });

  it("recalculates the payroll period totals after every payment insert", () => {
    expect(useHolidaysSrc).toMatch(/recalcPayrollPeriodTotals\(payment\.payroll_period_id\)/);
  });

  it("requires the approve_holidays permission", () => {
    expect(useHolidaysSrc).toMatch(/assertPermission\(["']approve_holidays["']/);
  });

  it("invalidates ledger + payment + period queries on success", () => {
    expect(useHolidaysSrc).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\[["']holiday_payments["'],\s*tenantId\]\s*\}\)/);
    expect(useHolidaysSrc).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\[["']holiday_ledger["']\]\s*\}\)/);
    expect(useHolidaysSrc).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\[["']payroll_periods["'],\s*tenantId\]\s*\}\)/);
  });
});

describe("useDeleteHolidayPayment — audited reversal contract", () => {
  it("blocks deletion when the linked payroll period is approved/locked", () => {
    expect(useHolidaysSrc).toMatch(/Cannot delete: payroll period is/);
    expect(useHolidaysSrc).toMatch(/Reopen the period first/);
  });

  it("removes the linked ledger row BEFORE deleting the payment", () => {
    const deleteFn = useHolidaysSrc.split("useDeleteHolidayPayment")[1] ?? "";
    const ledgerDel = deleteFn.indexOf('from("holiday_ledger")');
    const paymentDel = deleteFn.lastIndexOf('from("holiday_payments")');
    expect(ledgerDel).toBeGreaterThan(0);
    expect(paymentDel).toBeGreaterThan(ledgerDel); // ledger first, payment second
  });

  it("scopes the ledger delete to the source_id + entry_type pair", () => {
    expect(useHolidaysSrc).toMatch(/\.eq\(["']source_table["'],\s*["']holiday_payments["']\)/);
    expect(useHolidaysSrc).toMatch(/\.eq\(["']entry_type["'],\s*["']holiday_taken["']\)/);
  });
});

describe("import-historical-payroll — patched contract", () => {
  it("requires tenantId in the request body", () => {
    expect(importFnSrc).toMatch(/tenantId is required/i);
  });

  it("writes leave_year_start explicitly on every imported holiday_payments row", () => {
    expect(importFnSrc).toMatch(/leave_year_start:\s*leaveYearStart/);
    expect(importFnSrc).toMatch(/leaveYearStart\s*=\s*`\$\{[^}]+\}-01-01`/);
  });

  it("creates a matching holiday_ledger row linked to holiday_payments.id", () => {
    expect(importFnSrc).toMatch(/from\(["']holiday_ledger["']\)\s*\.insert/);
    expect(importFnSrc).toMatch(/source_table:\s*["']holiday_payments["']/);
    expect(importFnSrc).toMatch(/source_id:\s*holRow\.id/);
    expect(importFnSrc).toMatch(/entry_type:\s*["']holiday_taken["']/);
    expect(importFnSrc).toMatch(/hoursValue\s*=\s*-Math\.abs/);
  });

  it("treats duplicate ledger inserts as a no-op (replay-safe)", () => {
    expect(importFnSrc).toMatch(/ledgerErr\.code\s*===\s*["']23505["']/);
    expect(importFnSrc).toMatch(/ledgerDuplicatesSkipped\+\+/);
  });

  it("writes a non-silent audit_log row per import", () => {
    expect(importFnSrc).toMatch(/from\(["']audit_log["']\)\s*\.insert/);
    expect(importFnSrc).toMatch(/source:\s*["']import-historical-payroll["']/);
  });

  it("passes tenant_id on every public-schema insert (no schema leak)", () => {
    for (const table of [
      "employees",
      "payroll_periods",
      "payroll_entries",
      "holiday_payments",
      "holiday_ledger",
    ]) {
      // Match a `.from("<table>") ... .insert({ ... })` block and assert
      // tenant_id is present inside it. The cache-priming SELECTs on
      // `employees` are intentionally skipped by anchoring on `.insert(`.
      const pattern = new RegExp(
        `from\\([\\"\\']${table}[\\"\\']\\)[^]*?\\.insert\\(\\s*\\{[^}]*tenant_id:\\s*tenantId`,
      );
      expect(importFnSrc, `${table} insert must set tenant_id`).toMatch(pattern);
    }
  });
});
