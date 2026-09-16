import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  resolveTestSend,
  applyTestSubject,
  isTestEmployee,
  buildTestEmployeeInsert,
  TEST_EMPLOYEE_NAME,
} from "@/lib/contract-test-mode";
import { isRelevantToPayrollPeriod } from "@/lib/employee-period-relevance";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("test send resolution", () => {
  it("routes to the admin inbox in test mode", () => {
    const r = resolveTestSend({ testMode: true, staffEmail: "staff@x.com", adminEmail: "me@x.com" });
    expect(r.recipient).toBe("me@x.com");
    expect(r.isTest).toBe(true);
  });

  it("never persists send status or staff email in test mode", () => {
    const r = resolveTestSend({ testMode: true, staffEmail: "staff@x.com", adminEmail: "me@x.com" });
    expect(r.shouldPersistSendStatus).toBe(false);
    expect(r.shouldSaveEmailToEmployee).toBe(false);
  });

  it("real sends go to the staff member and persist as before", () => {
    const r = resolveTestSend({ testMode: false, staffEmail: "staff@x.com", adminEmail: "me@x.com" });
    expect(r.recipient).toBe("staff@x.com");
    expect(r.shouldPersistSendStatus).toBe(true);
    expect(r.shouldSaveEmailToEmployee).toBe(true);
  });

  it("honours a corrected address in both modes", () => {
    expect(
      resolveTestSend({ testMode: true, staffEmail: "s@x.com", adminEmail: "me@x.com", overrideEmail: "alt@x.com" }).recipient
    ).toBe("alt@x.com");
    expect(
      resolveTestSend({ testMode: false, staffEmail: "s@x.com", adminEmail: "me@x.com", overrideEmail: "alt@x.com" }).recipient
    ).toBe("alt@x.com");
  });

  it("marks test subjects once only", () => {
    expect(applyTestSubject("Your contract is ready to sign", true)).toBe("[TEST] Your contract is ready to sign");
    expect(applyTestSubject("[TEST] X", true)).toBe("[TEST] X");
    expect(applyTestSubject("Your contract is ready to sign", false)).toBe("Your contract is ready to sign");
  });
});

describe("test staff record", () => {
  it("detects the flag and the legacy name", () => {
    expect(isTestEmployee({ is_test_record: true })).toBe(true);
    expect(isTestEmployee({ forename: "ZZ Test", surname: "Staff (do not pay)" })).toBe(true);
    expect(isTestEmployee({ forename: "Real", surname: "Person" })).toBe(false);
    expect(isTestEmployee(null)).toBe(false);
  });

  it("builds a flagged insert with required fields", () => {
    const insert = buildTestEmployeeInsert({ tenantId: "t1", email: "me@x.com" });
    expect(insert.is_test_record).toBe(true);
    expect(insert.tenant_id).toBe("t1");
    expect(insert.email).toBe("me@x.com");
    expect(insert.department).toBeTruthy();
    expect(insert.hourly_rate).toBe(0);
    expect(`${insert.forename} ${insert.surname}`).toBe(TEST_EMPLOYEE_NAME);
  });

  it("is excluded from every payroll period", () => {
    const period = { start_date: "2026-06-01", end_date: "2026-06-28" };
    expect(
      isRelevantToPayrollPeriod({ id: "e1", status: "active", is_test_record: true }, period)
    ).toBe(false);
    expect(
      isRelevantToPayrollPeriod({ id: "e2", status: "active" }, period)
    ).toBe(true);
  });
});

describe("safety", () => {
  it("test sends skip the document send-status writes", () => {
    const src = read("src/hooks/useSendContractEmail.ts");
    expect(src).toMatch(/const isTest = !!params\.testMode/);
    expect(src).toMatch(/if \(!isTest\)/);
    expect(src).toMatch(/contract_email_test_send/);
  });

  it("no payroll, holiday, NMW or service-charge logic in the test-mode library", () => {
    const src = read("src/lib/contract-test-mode.ts");
    expect(src).not.toMatch(/from ["']@\/lib\/(payroll|holiday|nmw|service)/);
    expect(src).not.toMatch(/calculate|accrual|hourlyRate \*/i);
    expect(src).not.toMatch(/supabase|useQuery|fetch\(/);
  });

  it("the send box defaults the test switch to off", () => {
    const src = read("src/components/contracts/ContractSigningActions.tsx");
    expect(src).toMatch(/useState\(false\);\s*\n\s*const \{ user \} = useAuth\(\)/);
    expect(src).toMatch(/Send to me instead \(test run\)/);
  });
});
