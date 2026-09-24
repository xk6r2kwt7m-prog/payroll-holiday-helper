import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  DELETE_RPC,
  LIST_RESTORABLE_RPC,
  RESTORE_RPC,
  describeRecoveryRpcError,
  toRestorableDeletion,
} from "@/lib/payroll-period-restore";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");

const payrollHook = read("hooks/usePayroll.ts");
const restoreHook = read("hooks/usePayrollPeriodRestore.ts");
const deleteBlock = payrollHook.slice(
  payrollHook.indexOf("export function useDeletePayrollPeriod"),
  payrollHook.indexOf("export function useMarkBankDetailsExported"),
);

describe("payroll delete/restore uses only the database functions", () => {
  it("uses the agreed function names", () => {
    expect(DELETE_RPC).toBe("delete_draft_payroll_period");
    expect(RESTORE_RPC).toBe("restore_draft_payroll_period");
    expect(LIST_RESTORABLE_RPC).toBe("list_restorable_payroll_deletions");
  });

  it("no longer references the first-version names", () => {
    for (const src of [payrollHook, restoreHook]) {
      expect(src).not.toContain("payroll_period_delete_atomic");
      expect(src).not.toContain("payroll_period_restore_atomic");
    }
  });

  it("delete has no browser fallback touching payroll tables", () => {
    expect(deleteBlock).toContain("supabase.rpc(DELETE_RPC");
    expect(deleteBlock).not.toMatch(/\.from\(/);
    expect(deleteBlock).not.toMatch(/\.delete\(\)/);
    expect(deleteBlock).not.toContain("audit_log");
    expect(deleteBlock).toContain("_request_id");
  });

  it("restore has no browser fallback and never reads audit_log snapshots", () => {
    expect(restoreHook).toContain("supabase.rpc(RESTORE_RPC");
    expect(restoreHook).toContain("supabase.rpc(LIST_RESTORABLE_RPC");
    expect(restoreHook).not.toMatch(/\.from\(/);
    expect(restoreHook).not.toContain("audit_log");
    expect(restoreHook).not.toContain("old_data");
  });

  it("explains plainly when the database step is not installed", () => {
    expect(describeRecoveryRpcError({ code: "PGRST202", message: "Could not find the function" })).toMatch(
      /switched off.*Nothing was changed/,
    );
    expect(describeRecoveryRpcError({ message: "Only a draft payroll period can be deleted." })).toBe(
      "Only a draft payroll period can be deleted.",
    );
  });

  it("maps list rows to banner items without any snapshot", () => {
    const d = toRestorableDeletion({
      recovery_id: "r1",
      period_id: "p1",
      period_name: "September 2026",
      deleted_at: "2026-09-24T10:00:00Z",
      restore_expires_at: "2026-09-24T12:00:00Z",
      reason: null,
      counts: { entries: 3 },
    });
    expect(d).toMatchObject({ recoveryId: "r1", periodId: "p1", entryCount: 3 });
    expect(d).not.toHaveProperty("snapshot");
  });
});
