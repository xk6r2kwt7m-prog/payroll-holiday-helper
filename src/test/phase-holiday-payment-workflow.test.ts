// Wiring assertions complement the synthetic database transaction tests.
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

const paymentSql = readFileSync(resolve(__dirname, "../../supabase/pending-migrations/20260925090000_atomic_holiday_payments.sql"), "utf8");
describe("holiday payment transaction wiring", () => {
  it("routes create/update/delete through one RPC with no browser table-write fallback", () => {
    const mutations = useHolidaysSrc.slice(useHolidaysSrc.indexOf("function useHolidayPaymentTransaction"), useHolidaysSrc.indexOf("export function useReverseOrphanLedgerEntry"));
    expect(mutations).toContain("supabase.rpc(HOLIDAY_PAYMENT_RPC, args)");
    expect(mutations).toContain('"create", values, id');
    expect(mutations).toContain('"update", updates, id');
    expect(mutations).toContain('"delete", {}, paymentId');
    expect(mutations).not.toMatch(/\.from\(/);
  });
  it("keeps the permission check and refreshes derived data even after an uncertain response", () => {
    expect(useHolidaysSrc).toContain('assertPermission("approve_holidays"');
    expect(useHolidaysSrc).toContain("invalidateHolidayDerivedQueries(queryClient)");
    expect(useHolidaysSrc).toContain("onSettled: refresh");
  });
  it("installs server-side payment ledger and period safeguards", () => {
    expect(paymentSql).toContain("BEFORE INSERT OR UPDATE OR DELETE");
    expect(paymentSql).toContain("grand_total = worked + holidays");
    expect(paymentSql).toContain("-saved.hours,-saved.total");
    expect(paymentSql).toContain("REVOKE INSERT, UPDATE, DELETE ON public.holiday_payments");
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
